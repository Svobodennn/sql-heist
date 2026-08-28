import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSupabaseMock } = vi.hoisted(() => ({ getSupabaseMock: vi.fn() }))

vi.mock('@/lib/supabase', () => ({ getSupabase: getSupabaseMock }))

import { createMyProfile, type ProfileRow } from '@/features/auth/authClient'

const profile: ProfileRow = {
  id: 'user-1',
  username: 'neo_01',
  display_name: null,
  leaderboard_opt_in: false,
  created_at: '2026-08-24T00:00:00.000Z',
  updated_at: '2026-08-24T00:00:00.000Z',
}

function collisionClient(existing: ProfileRow | null, readError: { message: string } | null = null) {
  const insertSingle = vi.fn(async () => ({
    data: null,
    error: { code: '23505', message: 'duplicate key value violates unique constraint' },
  }))
  const insertSelect = vi.fn(() => ({ single: insertSingle }))
  const insert = vi.fn(() => ({ select: insertSelect }))

  const maybeSingle = vi.fn(async () => ({ data: existing, error: readError }))
  const eq = vi.fn(() => ({ maybeSingle }))
  const readSelect = vi.fn(() => ({ eq }))
  const from = vi
    .fn()
    .mockReturnValueOnce({ insert })
    .mockReturnValueOnce({ select: readSelect })

  return { client: { from }, from, insert, insertSelect, readSelect, eq }
}

beforeEach(() => {
  getSupabaseMock.mockReset()
})

describe('createMyProfile', () => {
  it('adopts the caller row after a concurrent-tab primary-key collision', async () => {
    const mocks = collisionClient(profile)
    getSupabaseMock.mockReturnValue(mocks.client)

    await expect(createMyProfile(profile.id, profile.username)).resolves.toEqual({ row: profile })
    expect(mocks.from).toHaveBeenNthCalledWith(1, 'profiles')
    expect(mocks.from).toHaveBeenNthCalledWith(2, 'profiles')
    expect(mocks.eq).toHaveBeenCalledWith('id', profile.id)
  })

  it('reports a taken username only when no own row exists after the collision', async () => {
    const mocks = collisionClient(null)
    getSupabaseMock.mockReturnValue(mocks.client)

    await expect(createMyProfile(profile.id, profile.username)).resolves.toEqual({
      error: 'username-taken',
    })
  })
})
