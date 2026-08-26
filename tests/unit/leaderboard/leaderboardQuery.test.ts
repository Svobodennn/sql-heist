import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSupabaseMock } = vi.hoisted(() => ({ getSupabaseMock: vi.fn() }))

vi.mock('@/lib/supabase', () => ({ getSupabase: getSupabaseMock }))

import { getLeaderboard, getMyRank } from '@/features/leaderboard/lib/leaderboardQuery'

interface LeaderboardDatabaseRow {
  username: string
  display_name: string | null
  objectives_cleared: number
  last_active: string | null
}

function leaderboardClient(
  data: LeaderboardDatabaseRow[],
  error: { message: string } | null = null,
) {
  const query = {
    order: vi.fn(),
    limit: vi.fn(async () => ({ data, error })),
  }
  query.order.mockImplementation(() => query)
  const select = vi.fn((_columns: string) => query)
  const from = vi.fn(() => ({ select }))
  return { client: { from }, from, select, order: query.order, limit: query.limit }
}

beforeEach(() => {
  getSupabaseMock.mockReset()
})

describe('getLeaderboard', () => {
  it('selects only curated public columns, orders deterministically, and clamps the limit', async () => {
    const rows: LeaderboardDatabaseRow[] = [
      {
        username: 'ada_l',
        display_name: 'Ada',
        objectives_cleared: 7,
        last_active: '2026-08-22T10:00:00.000Z',
      },
      {
        username: 'grace_h',
        display_name: null,
        objectives_cleared: 7,
        last_active: '2026-08-22T10:00:00.000Z',
      },
      {
        username: 'linus_t',
        display_name: 'Linus',
        objectives_cleared: 3,
        last_active: null,
      },
    ]
    const mocks = leaderboardClient(rows)
    getSupabaseMock.mockReturnValue(mocks.client)

    await expect(getLeaderboard(999)).resolves.toEqual([
      {
        rank: 1,
        username: 'ada_l',
        displayName: 'Ada',
        objectivesCleared: 7,
        lastActive: '2026-08-22T10:00:00.000Z',
      },
      {
        rank: 1,
        username: 'grace_h',
        displayName: null,
        objectivesCleared: 7,
        lastActive: '2026-08-22T10:00:00.000Z',
      },
      {
        rank: 3,
        username: 'linus_t',
        displayName: 'Linus',
        objectivesCleared: 3,
        lastActive: null,
      },
    ])
    expect(mocks.from).toHaveBeenCalledWith('leaderboard')
    expect(mocks.select).toHaveBeenCalledWith(
      'username, display_name, objectives_cleared, last_active',
    )
    expect(mocks.select.mock.calls[0]?.[0]).not.toMatch(/\bid\b|email/)
    expect(mocks.order.mock.calls).toEqual([
      ['objectives_cleared', { ascending: false }],
      ['last_active', { ascending: true, nullsFirst: false }],
      ['username', { ascending: true }],
    ])
    expect(mocks.limit).toHaveBeenCalledWith(100)
  })

  it('returns an empty board and uses the default page size', async () => {
    const mocks = leaderboardClient([])
    getSupabaseMock.mockReturnValue(mocks.client)

    await expect(getLeaderboard()).resolves.toEqual([])
    expect(mocks.limit).toHaveBeenCalledWith(50)
  })

  it('fails explicitly when Supabase is disabled or the view request fails', async () => {
    getSupabaseMock.mockReturnValue(null)
    await expect(getLeaderboard()).rejects.toMatchObject({ code: 'unavailable' })

    const mocks = leaderboardClient([], { message: 'view unavailable' })
    getSupabaseMock.mockReturnValue(mocks.client)
    await expect(getLeaderboard()).rejects.toMatchObject({
      code: 'request-failed',
      message: 'view unavailable',
    })
  })
})

describe('getMyRank', () => {
  it('maps the authenticated rank RPC without exposing another identity', async () => {
    const rpc = vi.fn(async () => ({
      data: [{ rank: 9, objectives_cleared: 12 }],
      error: null,
    }))
    getSupabaseMock.mockReturnValue({ rpc })

    await expect(getMyRank()).resolves.toEqual({ rank: 9, objectivesCleared: 12 })
    expect(rpc).toHaveBeenCalledWith('get_my_rank')
  })

  it('returns null when the caller is not opted in', async () => {
    getSupabaseMock.mockReturnValue({
      rpc: vi.fn(async () => ({ data: [], error: null })),
    })

    await expect(getMyRank()).resolves.toBeNull()
  })
})
