import type { SupabaseClient, User } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase'
import { getIdentityProviders } from '@/features/auth/oauthProfile'
import { validateUsername } from '@/features/auth/validation'

const PUBLIC_PROFILE_COLUMNS = 'username, display_name, created_at, objectives_cleared'
const MY_PROFILE_COLUMNS =
  'id, username, display_name, leaderboard_opt_in, delete_requested_at, created_at, updated_at'
const EXPORT_PROFILE_COLUMNS =
  'id, username, display_name, leaderboard_opt_in, delete_requested_at, created_at, updated_at'
const EXPORT_PROGRESS_COLUMNS = 'case_id, completed_objectives, best_score, updated_at'
const EXPORT_CONSENT_COLUMNS = 'id, purpose, action, notice_version, source, occurred_at'
const SAFE_AUTH_METADATA_KEYS = [
  'sub',
  'email',
  'email_verified',
  'phone_verified',
  'username',
  'name',
  'full_name',
  'user_name',
  'preferred_username',
  'nickname',
  'avatar_url',
  'picture',
] as const

export const DISPLAY_NAME_MAX_LENGTH = 40
export const PUBLIC_PROFILE_NOTICE_VERSION = '2026-08-26'

export type ProfileQueryErrorCode =
  'auth-disabled' | 'auth-required' | 'invalid-profile' | 'reauth-failed' | 'request-failed'

export class ProfileQueryError extends Error {
  constructor(
    public readonly code: ProfileQueryErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'ProfileQueryError'
  }
}

export interface PublicProfile {
  username: string
  displayName: string | null
  createdAt: string
  objectivesCleared: number
}

export interface MyProfile {
  id: string
  username: string
  displayName: string | null
  leaderboardOptIn: boolean
  deleteRequestedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface MyProfilePatch {
  displayName?: string | null
}

interface PublicProfileRow {
  username: string
  display_name: string | null
  created_at: string
  objectives_cleared: number
}

interface MyProfileRow {
  id: string
  username: string
  display_name: string | null
  leaderboard_opt_in: boolean
  delete_requested_at: string | null
  created_at: string
  updated_at: string
}

function requireClient(): SupabaseClient {
  const client = getSupabase()
  if (!client) {
    throw new ProfileQueryError('auth-disabled', 'Supabase is not configured')
  }
  return client
}

async function requireUser(client: SupabaseClient): Promise<User> {
  const { data, error } = await client.auth.getUser()
  if (error) throw new ProfileQueryError('request-failed', error.message)
  if (!data.user) throw new ProfileQueryError('auth-required', 'Authentication required')
  return data.user
}

function throwIfError(error: { message: string } | null): void {
  if (error) throw new ProfileQueryError('request-failed', error.message)
}

function toPublicProfile(row: PublicProfileRow): PublicProfile {
  return {
    username: row.username,
    displayName: row.display_name,
    createdAt: row.created_at,
    objectivesCleared: row.objectives_cleared,
  }
}

function toMyProfile(row: MyProfileRow): MyProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    leaderboardOptIn: row.leaderboard_opt_in,
    deleteRequestedAt: row.delete_requested_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function normalizeOptionalField(
  value: string | null,
  minLength: number,
  maxLength: number,
  label: string,
): string | null {
  if (value === null) return null
  const normalized = value.trim()
  if (!normalized) return null
  if (normalized.length < minLength) {
    throw new ProfileQueryError('invalid-profile', `${label} is too short`)
  }
  if (normalized.length > maxLength) {
    throw new ProfileQueryError('invalid-profile', `${label} is too long`)
  }
  return normalized
}

export function profileFieldsAreValid(displayName: string): boolean {
  return displayName.trim().length <= DISPLAY_NAME_MAX_LENGTH
}

function safeAuthMetadata(value: unknown): Record<string, string | number | boolean | null> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  const metadata = value as Record<string, unknown>
  const safe: Record<string, string | number | boolean | null> = {}

  for (const key of SAFE_AUTH_METADATA_KEYS) {
    const field = metadata[key]
    if (
      typeof field === 'string' ||
      typeof field === 'number' ||
      typeof field === 'boolean' ||
      field === null
    ) {
      safe[key] = field
    }
  }

  return safe
}

function exportAccount(user: User) {
  return {
    id: user.id,
    email: user.email ?? null,
    created_at: user.created_at,
    updated_at: user.updated_at ?? null,
    last_sign_in_at: user.last_sign_in_at ?? null,
    providers: getIdentityProviders(user),
    user_metadata: safeAuthMetadata(user.user_metadata),
    identities: (user.identities ?? []).map((identity) => ({
      identity_id: identity.identity_id ?? identity.id,
      provider: identity.provider,
      created_at: identity.created_at ?? null,
      updated_at: identity.updated_at ?? null,
      last_sign_in_at: identity.last_sign_in_at ?? null,
      identity_data: safeAuthMetadata(identity.identity_data),
    })),
  }
}

async function updateOwnRow(patch: Record<string, string | boolean | null>): Promise<MyProfile> {
  const client = requireClient()
  const user = await requireUser(client)
  const { data, error } = await client
    .from('profiles')
    .update({ ...patch })
    .eq('id', user.id)
    .select(MY_PROFILE_COLUMNS)
    .single()
  throwIfError(error)
  return toMyProfile(data as MyProfileRow)
}

export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const candidate = username.trim().toLowerCase()
  if (validateUsername(candidate)) return null

  const client = requireClient()
  const { data, error } = await client
    .from('public_profiles')
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq('username', candidate)
    .maybeSingle()
  throwIfError(error)
  return data ? toPublicProfile(data as PublicProfileRow) : null
}

export async function getMyProfile(): Promise<MyProfile | null> {
  const client = requireClient()
  const user = await requireUser(client)
  const { data, error } = await client
    .from('profiles')
    .select(MY_PROFILE_COLUMNS)
    .eq('id', user.id)
    .maybeSingle()
  throwIfError(error)
  return data ? toMyProfile(data as MyProfileRow) : null
}

export async function updateMyProfile(patch: MyProfilePatch): Promise<MyProfile> {
  const update: Record<string, string | null> = {}
  if (patch.displayName !== undefined) {
    update.display_name = normalizeOptionalField(
      patch.displayName,
      1,
      DISPLAY_NAME_MAX_LENGTH,
      'Display name',
    )
  }
  if (Object.keys(update).length === 0) {
    throw new ProfileQueryError('invalid-profile', 'No profile changes supplied')
  }
  return updateOwnRow(update)
}

export async function setLeaderboardOptIn(enabled: boolean): Promise<MyProfile> {
  const client = requireClient()
  await requireUser(client)
  const { data, error } = await client.rpc('set_public_profile_consent', {
    p_enabled: enabled,
    p_notice_version: PUBLIC_PROFILE_NOTICE_VERSION,
  })
  throwIfError(error)
  if (!data) {
    throw new ProfileQueryError('request-failed', 'Consent update returned no profile')
  }
  return toMyProfile(data as MyProfileRow)
}

export async function exportMyData(): Promise<Blob> {
  const client = requireClient()
  const user = await requireUser(client)
  const [profileResult, progressResult, consentResult] = await Promise.all([
    client.from('profiles').select(EXPORT_PROFILE_COLUMNS).eq('id', user.id).maybeSingle(),
    client.from('case_progress').select(EXPORT_PROGRESS_COLUMNS).eq('user_id', user.id),
    client
      .from('profile_consent_events')
      .select(EXPORT_CONSENT_COLUMNS)
      .eq('user_id', user.id)
      .order('id', { ascending: true }),
  ])
  throwIfError(profileResult.error)
  throwIfError(progressResult.error)
  throwIfError(consentResult.error)

  const payload = {
    exportVersion: 3,
    exportedAt: new Date().toISOString(),
    account: exportAccount(user),
    profiles: profileResult.data ? [profileResult.data as MyProfileRow] : [],
    case_progress: progressResult.data ?? [],
    profile_consent_events: consentResult.data ?? [],
  }

  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
}

async function submitDeletionRequest(client: SupabaseClient, userId: string): Promise<void> {
  const { data, error } = await client.rpc('request_account_deletion', {
    p_expected_user_id: userId,
  })
  if (!error && data) return

  // The RPC may have committed while its response was lost. Own-row SELECT stays
  // available after the soft lock, so a recorded timestamp makes this retry a
  // success instead of presenting an unrecoverable failure to the user.
  const status = await client
    .from('profiles')
    .select('delete_requested_at')
    .eq('id', userId)
    .maybeSingle()
  if (!status.error && status.data?.delete_requested_at) return

  const message = error?.message ?? status.error?.message ?? 'Deletion request failed'
  const recentAuthRejected = /recent (?:password|oauth|authentication)/i.test(message)
  throw new ProfileQueryError(recentAuthRejected ? 'reauth-failed' : 'request-failed', message)
}

// Called only after the OAuth callback has matched the returning session to the
// original account. The database independently enforces the recent AMR claim.
export async function requestMyAccountDeletion(): Promise<void> {
  const client = requireClient()
  const user = await requireUser(client)
  await submitDeletionRequest(client, user.id)
}

// Client-only auth cannot delete auth.users without exposing a service credential.
// Re-authenticate with the current password, then call the same caller-bound,
// server-timestamped RPC used by the OAuth recent-auth path.
export async function deleteMyAccount(password: string): Promise<void> {
  const client = requireClient()
  const user = await requireUser(client)
  if (!user.email || password.length === 0) {
    throw new ProfileQueryError('reauth-failed', 'Current password required')
  }

  const reauthentication = await client.auth.signInWithPassword({
    email: user.email,
    password,
  })
  if (reauthentication.error) {
    throw new ProfileQueryError(
      reauthentication.error.code === 'invalid_credentials' ? 'reauth-failed' : 'request-failed',
      reauthentication.error.message,
    )
  }
  if (reauthentication.data.user?.id !== user.id) {
    throw new ProfileQueryError('reauth-failed', 'Re-authentication failed')
  }

  await submitDeletionRequest(client, user.id)
}
