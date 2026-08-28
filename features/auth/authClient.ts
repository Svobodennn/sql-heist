import { getSupabase } from '@/lib/supabase'
import { clearOAuthAttempt, rememberOAuthAttempt, type OAuthAttempt } from './oauthFlow'
import type { OAuthProvider } from './oauthProfile'

// Thin wrappers over supabase-js auth/PostgREST. Every function no-ops with a
// typed error code when Supabase is not configured, so callers never branch on
// the client themselves. Codes map 1:1 to `auth.errors.*` i18n keys.
export type AuthErrorCode =
  | 'auth-disabled'
  | 'invalid-credentials'
  | 'email-not-confirmed'
  | 'user-exists'
  | 'weak-password'
  | 'rate-limited'
  | 'username-taken'
  | 'generic'

export interface AuthResult {
  error?: AuthErrorCode
}

// GoTrue only gives us English message strings — this mapping is best-effort,
// with 'generic' as the safe floor. Exported for unit tests.
export function mapAuthError(message: string, status?: number): AuthErrorCode {
  const m = message.toLowerCase()
  if (status === 429 || m.includes('rate limit') || m.includes('too many requests'))
    return 'rate-limited'
  if (m.includes('invalid login credentials')) return 'invalid-credentials'
  if (m.includes('email not confirmed')) return 'email-not-confirmed'
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'user-exists'
  if (m.includes('password should be')) return 'weak-password'
  return 'generic'
}

function callbackUrl(): string {
  return `${window.location.origin}/auth/callback`
}

function deletionVerificationQueryParams(
  provider: OAuthProvider,
  attempt: OAuthAttempt,
): Record<string, string> | undefined {
  if (attempt.purpose !== 'account-deletion') return undefined

  // Neither provider guarantees a fresh password challenge while its own SSO
  // session is active. Use their documented interactive controls so deletion
  // verification cannot silently skip the provider screen; the callback and RPC
  // still bind the result to the account that initiated the request.
  return {
    prompt: provider === 'google' ? 'consent select_account' : 'select_account',
  }
}

export async function signInOAuth(
  provider: OAuthProvider,
  attempt: OAuthAttempt,
): Promise<AuthResult> {
  const supabase = getSupabase()
  if (!supabase) return { error: 'auth-disabled' }

  clearPendingEmail()
  const attemptRemembered = rememberOAuthAttempt(provider, attempt)
  if (!attemptRemembered) return { error: 'generic' }
  const queryParams = deletionVerificationQueryParams(provider, attempt)
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callbackUrl(),
      ...(queryParams ? { queryParams } : {}),
    },
  })
  if (!error) return {}

  clearOAuthAttempt()
  return { error: mapAuthError(error.message, error.status) }
}

export async function signUpEmail(
  email: string,
  password: string,
  username: string,
): Promise<AuthResult> {
  const supabase = getSupabase()
  if (!supabase) return { error: 'auth-disabled' }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Username rides along as metadata; the profiles row itself is created by
      // UsernameGate after the first confirmed sign-in (RLS insert-self).
      data: { username },
      emailRedirectTo: callbackUrl(),
    },
  })
  if (error) {
    const mapped = mapAuthError(error.message, error.status)
    return mapped === 'user-exists' ? {} : { error: mapped }
  }
  // Supabase intentionally returns an identity-less user for an existing email.
  // Preserve that indistinguishable success response instead of rebuilding an
  // account-existence oracle in the client.
  if (data.user && (data.user.identities?.length ?? 0) === 0) return {}
  return {}
}

export async function signInEmail(email: string, password: string): Promise<AuthResult> {
  const supabase = getSupabase()
  if (!supabase) return { error: 'auth-disabled' }
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: mapAuthError(error.message, error.status) }
  clearPendingEmail() // signup handshake is over; don't leave the address behind
  return {}
}

export async function signOut(): Promise<void> {
  clearPendingEmail() // never outlive the session on a shared machine
  await getSupabase()?.auth.signOut()
}

// Manual PKCE fallback for the static callback page — normally
// `detectSessionInUrl` consumes `?code=` on its own.
export async function exchangeCode(code: string): Promise<AuthResult> {
  const supabase = getSupabase()
  if (!supabase) return { error: 'auth-disabled' }
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  return error ? { error: mapAuthError(error.message, error.status) } : {}
}

export async function resendSignupEmail(email: string): Promise<AuthResult> {
  const supabase = getSupabase()
  if (!supabase) return { error: 'auth-disabled' }
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: callbackUrl() },
  })
  return error ? { error: mapAuthError(error.message, error.status) } : {}
}

// Kept as a compatibility seam for the existing hook. Browser-side availability
// probing is disabled; profile INSERT plus the unique constraint is the arbiter.
export async function usernameAvailable(_username: string): Promise<boolean | null> {
  // The private-name probe is intentionally disabled. Profile INSERT plus the
  // unique constraint is the only browser-visible collision check.
  return null
}

export interface ProfileRow {
  id: string
  username: string
  display_name: string | null
  leaderboard_opt_in: boolean
  created_at: string
  updated_at: string
}

const PROFILE_COLUMNS = 'id, username, display_name, leaderboard_opt_in, created_at, updated_at'

// Returns the created row so the caller can adopt it directly — avoids a second
// round trip whose transient failure would otherwise strand the UsernameGate
// open over a row that already exists (a self-inflicted 23505 on retry).
export async function createMyProfile(
  userId: string,
  username: string,
): Promise<{ error?: AuthErrorCode; row?: ProfileRow }> {
  const supabase = getSupabase()
  if (!supabase) return { error: 'auth-disabled' }
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId, username })
    .select(PROFILE_COLUMNS)
    .single()
  if (!error) return { row: data as ProfileRow }
  if (error.code === '23505') {
    // A concurrent tab may already have created this user's row. RLS makes this
    // recovery read caller-bound: adopt the own row when it exists, and only
    // report a taken username when the collision belongs to somebody else.
    const existing = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle()
    if (!existing.error && existing.data) return { row: existing.data as ProfileRow }
    if (existing.error) return { error: mapAuthError(existing.error.message) }
    return { error: 'username-taken' }
  }
  return { error: mapAuthError(error.message) }
}

// The confirm email lands in a fresh tab with no app state; remembering the
// pending address locally lets the callback's error path offer a resend. The
// default confirmation link expires after one hour, so the local copy does too.
const PENDING_EMAIL_KEY = 'sql-heist:auth:pending-email'
const PENDING_EMAIL_TTL_MS = 60 * 60 * 1000

interface PendingEmail {
  email: string
  expiresAt: number
}

export function rememberPendingEmail(email: string): void {
  try {
    const pending: PendingEmail = {
      email,
      expiresAt: Date.now() + PENDING_EMAIL_TTL_MS,
    }
    window.localStorage.setItem(PENDING_EMAIL_KEY, JSON.stringify(pending))
  } catch {
    // Private mode / storage disabled — resend affordance simply won't show.
  }
}

export function readPendingEmail(): string | null {
  try {
    const stored = window.localStorage.getItem(PENDING_EMAIL_KEY)
    if (!stored) return null
    const pending = JSON.parse(stored) as Partial<PendingEmail>
    if (
      typeof pending.email !== 'string' ||
      typeof pending.expiresAt !== 'number' ||
      !Number.isFinite(pending.expiresAt) ||
      Date.now() >= pending.expiresAt
    ) {
      clearPendingEmail()
      return null
    }
    return pending.email
  } catch {
    clearPendingEmail()
    return null
  }
}

// Called once when the app mounts so an expired or malformed value is removed
// even if the visitor never opens the callback/resend flow again.
export function clearExpiredPendingEmail(): void {
  void readPendingEmail()
}

export function clearPendingEmail(): void {
  try {
    window.localStorage.removeItem(PENDING_EMAIL_KEY)
  } catch {
    // Ignore.
  }
}
