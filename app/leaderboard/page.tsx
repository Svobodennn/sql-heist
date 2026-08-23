import type { Metadata } from 'next'
import { LeaderboardTable } from '@/features/leaderboard'

export const metadata: Metadata = {
  title: 'Casual leaderboard',
  description: 'Opted-in SQL Heist operatives ranked by client-submitted objectives cleared.',
}

export default function LeaderboardPage() {
  return <LeaderboardTable />
}
