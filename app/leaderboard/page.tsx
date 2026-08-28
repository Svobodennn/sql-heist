import type { Metadata } from 'next'
import { LeaderboardTable } from '@/features/leaderboard'
import { pageAlternates } from '../localeMeta'

export const metadata: Metadata = {
  title: 'Casual leaderboard',
  description: 'Opted-in SQL Heist operatives ranked by client-submitted objectives cleared.',
  alternates: pageAlternates('/leaderboard', 'en'),
}

export default function LeaderboardPage() {
  return <LeaderboardTable />
}
