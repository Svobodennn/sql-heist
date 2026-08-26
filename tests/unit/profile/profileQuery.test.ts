import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSupabaseMock } = vi.hoisted(() => ({ getSupabaseMock: vi.fn() }))

vi.mock('@/lib/supabase', () => ({ getSupabase: getSupabaseMock }))

import {
  DISPLAY_NAME_MAX_LENGTH,
  PUBLIC_PROFILE_NOTICE_VERSION,
  deleteMyAccount,
  exportMyData,
  getPublicProfile,
  setLeaderboardOptIn,
  updateMyProfile,
} from '@/features/profile/lib/profileQuery'

const user = { id: 'user-1', email: 'ada@example.com' }
const profileRow = {
  id: user.id,
  username: 'ada_l',
  display_name: 'Ada',
  leaderboard_opt_in: true,
  delete_requested_at: null,
  created_at: '2026-08-22T00:00:00.000Z',
  updated_at: '2026-08-22T00:00:00.000Z',
}

function authReturning(currentUser: typeof user | null = user) {
  return {
    getUser: vi.fn(async () => ({
      data: { user: currentUser },
      error: null,
    })),
    signInWithPassword: vi.fn(
      async (): Promise<{
        data: { user: typeof user | null }
        error: { message: string; code?: string } | null
      }> => ({ data: { user: currentUser }, error: null }),
    ),
  }
}

beforeEach(() => {
  getSupabaseMock.mockReset()
})

describe('getPublicProfile', () => {
  it('selects only the curated public columns and maps the row', async () => {
    const maybeSingle = vi.fn(async () => ({
      data: {
        username: 'ada_l',
        display_name: 'Ada',
        created_at: '2026-08-22T00:00:00.000Z',
        objectives_cleared: 7,
      },
      error: null,
    }))
    const eq = vi.fn(() => ({ maybeSingle }))
    const select = vi.fn((_columns: string) => ({ eq }))
    const from = vi.fn(() => ({ select }))
    getSupabaseMock.mockReturnValue({ from })

    await expect(getPublicProfile('  ADA_L  ')).resolves.toEqual({
      username: 'ada_l',
      displayName: 'Ada',
      createdAt: '2026-08-22T00:00:00.000Z',
      objectivesCleared: 7,
    })
    expect(from).toHaveBeenCalledWith('public_profiles')
    expect(select).toHaveBeenCalledWith('username, display_name, created_at, objectives_cleared')
    expect(select.mock.calls[0]?.[0]).not.toMatch(/\bid\b|email/)
    expect(eq).toHaveBeenCalledWith('username', 'ada_l')
  })

  it('returns null for an empty name or a private/missing profile', async () => {
    getSupabaseMock.mockReturnValue({ from: vi.fn() })
    await expect(getPublicProfile('   ')).resolves.toBeNull()

    const maybeSingle = vi.fn(async () => ({ data: null, error: null }))
    const eq = vi.fn(() => ({ maybeSingle }))
    getSupabaseMock.mockReturnValue({ from: vi.fn(() => ({ select: () => ({ eq }) })) })
    await expect(getPublicProfile('hidden')).resolves.toBeNull()
  })

  it('fails explicitly when Supabase is disabled', async () => {
    getSupabaseMock.mockReturnValue(null)
    await expect(getPublicProfile('ada_l')).rejects.toMatchObject({ code: 'auth-disabled' })
  })
})

describe('own-profile mutations', () => {
  it('rejects display names outside the live profiles table bounds before any request', async () => {
    await expect(
      updateMyProfile({ displayName: 'x'.repeat(DISPLAY_NAME_MAX_LENGTH + 1) }),
    ).rejects.toMatchObject({ code: 'invalid-profile' })
    expect(getSupabaseMock).not.toHaveBeenCalled()
  })

  it('trims the optional display name and updates only the caller row', async () => {
    const single = vi.fn(async () => ({ data: profileRow, error: null }))
    const select = vi.fn(() => ({ single }))
    const eq = vi.fn(() => ({ select }))
    const update = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ update }))
    getSupabaseMock.mockReturnValue({ auth: authReturning(), from })

    await expect(updateMyProfile({ displayName: '  Ada  ' })).resolves.toMatchObject({
      displayName: 'Ada',
    })
    expect(update).toHaveBeenCalledWith({ display_name: 'Ada' })
    expect(eq).toHaveBeenCalledWith('id', user.id)
  })

  it('records leaderboard consent through the versioned own-user RPC', async () => {
    const rpc = vi.fn(async () => ({
      data: { ...profileRow, leaderboard_opt_in: false },
      error: null,
    }))
    const from = vi.fn()
    getSupabaseMock.mockReturnValue({
      auth: authReturning(),
      from,
      rpc,
    })

    await expect(setLeaderboardOptIn(false)).resolves.toMatchObject({ leaderboardOptIn: false })
    expect(rpc).toHaveBeenCalledWith('set_public_profile_consent', {
      p_enabled: false,
      p_notice_version: PUBLIC_PROFILE_NOTICE_VERSION,
    })
    expect(from).not.toHaveBeenCalled()
  })

  it('re-authenticates before calling the server-timestamped deletion RPC', async () => {
    const auth = authReturning()
    const rpc = vi.fn(async () => ({
      data: '2026-08-23T00:00:00.000Z',
      error: null,
    }))
    const from = vi.fn()
    getSupabaseMock.mockReturnValue({ auth, from, rpc })

    await expect(deleteMyAccount('correct horse')).resolves.toBeUndefined()
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: user.email,
      password: 'correct horse',
    })
    expect(rpc).toHaveBeenCalledWith('request_account_deletion')
    expect(from).not.toHaveBeenCalled()
  })

  it('does not request deletion when password re-authentication fails', async () => {
    const auth = authReturning()
    auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials', code: 'invalid_credentials' },
    })
    const rpc = vi.fn()
    getSupabaseMock.mockReturnValue({ auth, from: vi.fn(), rpc })

    await expect(deleteMyAccount('wrong')).rejects.toMatchObject({ code: 'reauth-failed' })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('does not misreport a re-authentication service failure as a wrong password', async () => {
    const auth = authReturning()
    auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Too many requests', code: 'over_request_rate_limit' },
    })
    const rpc = vi.fn()
    getSupabaseMock.mockReturnValue({ auth, from: vi.fn(), rpc })

    await expect(deleteMyAccount('correct horse')).rejects.toMatchObject({
      code: 'request-failed',
    })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('treats a recorded timestamp as success when the RPC response is lost', async () => {
    const auth = authReturning()
    const maybeSingle = vi.fn(async () => ({
      data: { delete_requested_at: '2026-08-23T00:00:00.000Z' },
      error: null,
    }))
    const eq = vi.fn(() => ({ maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ select }))
    const rpc = vi.fn(async () => ({
      data: null,
      error: { message: 'response interrupted' },
    }))
    getSupabaseMock.mockReturnValue({ auth, from, rpc })

    await expect(deleteMyAccount('correct horse')).resolves.toBeUndefined()
    expect(select).toHaveBeenCalledWith('delete_requested_at')
    expect(eq).toHaveBeenCalledWith('id', user.id)
  })
})

describe('exportMyData', () => {
  it('exports only the authenticated user profile, progress, and consent history as JSON', async () => {
    const profileMaybeSingle = vi.fn(async () => ({ data: profileRow, error: null }))
    const profileEq = vi.fn(() => ({ maybeSingle: profileMaybeSingle }))
    const progressEq = vi.fn(async () => ({
      data: [
        {
          case_id: 'the-front-door',
          completed_objectives: ['bypass-login'],
          best_score: null,
          updated_at: '2026-08-22T01:00:00.000Z',
        },
      ],
      error: null,
    }))
    const consentOrder = vi.fn(async () => ({
      data: [
        {
          id: 11,
          purpose: 'public_profile',
          action: 'granted',
          notice_version: PUBLIC_PROFILE_NOTICE_VERSION,
          source: 'account_settings',
          occurred_at: '2026-08-22T02:00:00.000Z',
        },
      ],
      error: null,
    }))
    const consentEq = vi.fn(() => ({ order: consentOrder }))
    const profileSelect = vi.fn(() => ({ eq: profileEq }))
    const progressSelect = vi.fn(() => ({ eq: progressEq }))
    const consentSelect = vi.fn(() => ({ eq: consentEq }))
    const from = vi.fn((table: string) => ({
      select:
        table === 'profiles'
          ? profileSelect
          : table === 'case_progress'
            ? progressSelect
            : consentSelect,
    }))
    getSupabaseMock.mockReturnValue({ auth: authReturning(), from })

    const blob = await exportMyData()
    const payload = JSON.parse(await blob.text())

    expect(payload).toMatchObject({
      exportVersion: 2,
      account: { email: user.email },
      profiles: [profileRow],
      case_progress: [
        {
          case_id: 'the-front-door',
          completed_objectives: ['bypass-login'],
        },
      ],
      profile_consent_events: [
        {
          id: 11,
          purpose: 'public_profile',
          action: 'granted',
          notice_version: PUBLIC_PROFILE_NOTICE_VERSION,
          source: 'account_settings',
        },
      ],
    })
    expect(profileEq).toHaveBeenCalledWith('id', user.id)
    expect(progressEq).toHaveBeenCalledWith('user_id', user.id)
    expect(consentEq).toHaveBeenCalledWith('user_id', user.id)
    expect(consentSelect).toHaveBeenCalledWith(
      'id, purpose, action, notice_version, source, occurred_at',
    )
    expect(profileSelect).toHaveBeenCalledWith(
      'id, username, display_name, leaderboard_opt_in, delete_requested_at, created_at, updated_at',
    )
    expect(JSON.stringify(payload)).not.toContain('country')
    expect(consentOrder).toHaveBeenCalledWith('id', { ascending: true })
    expect(blob.type).toBe('application/json')
  })
})
