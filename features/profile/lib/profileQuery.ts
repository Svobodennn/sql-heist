import type { SupabaseClient, User } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase'

const PUBLIC_PROFILE_COLUMNS = 'username, display_name, country, created_at, objectives_cleared'
const MY_PROFILE_COLUMNS =
  'id, username, display_name, country, leaderboard_opt_in, delete_requested_at, created_at, updated_at'
const EXPORT_PROGRESS_COLUMNS = 'case_id, completed_objectives, best_score, updated_at'

export const DISPLAY_NAME_MAX_LENGTH = 80
export const COUNTRY_MAX_LENGTH = 56

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
  country: string | null
  createdAt: string
  objectivesCleared: number
}

export interface MyProfile {
  id: string
  username: string
  displayName: string | null
  country: string | null
  leaderboardOptIn: boolean
  deleteRequestedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface MyProfilePatch {
  displayName?: string | null
  country?: string | null
}

interface PublicProfileRow {
  username: string
  display_name: string | null
  country: string | null
  created_at: string
  objectives_cleared: number
}

interface MyProfileRow {
  id: string
  username: string
  display_name: string | null
  country: string | null
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
    country: row.country,
    createdAt: row.created_at,
    objectivesCleared: row.objectives_cleared,
  }
}

function toMyProfile(row: MyProfileRow): MyProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    country: row.country,
    leaderboardOptIn: row.leaderboard_opt_in,
    deleteRequestedAt: row.delete_requested_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function normalizeOptionalField(
  value: string | null,
  maxLength: number,
  label: string,
): string | null {
  if (value === null) return null
  const normalized = value.trim()
  if (normalized.length > maxLength) {
    throw new ProfileQueryError('invalid-profile', `${label} is too long`)
  }
  return normalized || null
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
  if (!candidate) return null

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
      DISPLAY_NAME_MAX_LENGTH,
      'Display name',
    )
  }
  if (patch.country !== undefined) {
    update.country = normalizeOptionalField(patch.country, COUNTRY_MAX_LENGTH, 'Country')
  }
  if (Object.keys(update).length === 0) {
    throw new ProfileQueryError('invalid-profile', 'No profile changes supplied')
  }
  return updateOwnRow(update)
}

export async function setLeaderboardOptIn(enabled: boolean): Promise<MyProfile> {
  return updateOwnRow({ leaderboard_opt_in: enabled })
}

export async function exportMyData(): Promise<Blob> {
  const client = requireClient()
  const user = await requireUser(client)
  const [profileResult, progressResult] = await Promise.all([
    client.from('profiles').select(MY_PROFILE_COLUMNS).eq('id', user.id).maybeSingle(),
    client.from('case_progress').select(EXPORT_PROGRESS_COLUMNS).eq('user_id', user.id),
  ])
  throwIfError(profileResult.error)
  throwIfError(progressResult.error)

  const payload = {
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    account: { email: user.email ?? null },
    profiles: profileResult.data ? [profileResult.data as MyProfileRow] : [],
    case_progress: progressResult.data ?? [],
  }

  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
}

// Client-only auth cannot delete auth.users without exposing a service credential.
// Re-authenticate with the current password, then call the narrowly scoped,
// server-timestamped RPC that records an idempotent own-account erasure request.
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

  const { data, error } = await client.rpc('request_account_deletion')
  if (!error && data) return

  // The RPC may have committed while its response was lost. Own-row SELECT stays
  // available after the soft lock, so a recorded timestamp makes this retry a
  // success instead of presenting an unrecoverable failure to the user.
  const status = await client
    .from('profiles')
    .select('delete_requested_at')
    .eq('id', user.id)
    .maybeSingle()
  if (!status.error && status.data?.delete_requested_at) return

  throw new ProfileQueryError(
    'request-failed',
    error?.message ?? status.error?.message ?? 'Deletion request failed',
  )
}
