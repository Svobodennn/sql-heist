import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase'

const LEADERBOARD_COLUMNS = 'username, display_name, objectives_cleared, last_active'
const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

export type LeaderboardQueryErrorCode = 'unavailable' | 'request-failed'

export class LeaderboardQueryError extends Error {
  constructor(
    public readonly code: LeaderboardQueryErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'LeaderboardQueryError'
  }
}

export interface LeaderboardRow {
  rank: number
  username: string
  displayName: string | null
  objectivesCleared: number
  lastActive: string | null
}

export interface MyRank {
  rank: number
  objectivesCleared: number
}

interface LeaderboardDatabaseRow {
  username: string
  display_name: string | null
  objectives_cleared: number
  last_active: string | null
}

interface MyRankDatabaseRow {
  rank: number
  objectives_cleared: number
}

function requireClient(): SupabaseClient {
  const client = getSupabase()
  if (!client) {
    throw new LeaderboardQueryError('unavailable', 'Supabase is not configured')
  }
  return client
}

function throwIfError(error: { message: string } | null): void {
  if (error) throw new LeaderboardQueryError('request-failed', error.message)
}

function normalizeLimit(limit: number): number {
  const candidate = Number.isFinite(limit) ? Math.trunc(limit) : DEFAULT_LIMIT
  return Math.min(Math.max(candidate, 1), MAX_LIMIT)
}

function sameRank(
  previous: LeaderboardDatabaseRow | undefined,
  current: LeaderboardDatabaseRow,
): boolean {
  return (
    previous?.objectives_cleared === current.objectives_cleared &&
    previous.last_active === current.last_active
  )
}

function toLeaderboardRows(rows: LeaderboardDatabaseRow[]): LeaderboardRow[] {
  return rows.reduce<LeaderboardRow[]>((ranked, row, index) => {
    const previousRank = ranked[index - 1]?.rank
    const rank = sameRank(rows[index - 1], row) && previousRank ? previousRank : index + 1
    return [
      ...ranked,
      {
        rank,
        username: row.username,
        displayName: row.display_name,
        objectivesCleared: row.objectives_cleared,
        lastActive: row.last_active,
      },
    ]
  }, [])
}

export async function getLeaderboard(limit = DEFAULT_LIMIT): Promise<LeaderboardRow[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('leaderboard')
    .select(LEADERBOARD_COLUMNS)
    .order('objectives_cleared', { ascending: false })
    .order('last_active', { ascending: true, nullsFirst: false })
    .order('username', { ascending: true })
    .limit(normalizeLimit(limit))
  throwIfError(error)
  return toLeaderboardRows((data ?? []) as LeaderboardDatabaseRow[])
}

export async function getMyRank(): Promise<MyRank | null> {
  const client = requireClient()
  const { data, error } = await client.rpc('get_my_rank')
  throwIfError(error)
  const row = (data as MyRankDatabaseRow[] | null)?.[0]
  return row ? { rank: row.rank, objectivesCleared: row.objectives_cleared } : null
}
