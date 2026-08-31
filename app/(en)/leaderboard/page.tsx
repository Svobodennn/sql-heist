import type { Metadata } from 'next'
import { LeaderboardTable } from '@/features/leaderboard'
import { pageMeta } from '@/app/localeMeta'

export const metadata: Metadata = pageMeta('/leaderboard', 'en', {
  title: 'Casual leaderboard',
  description: 'Opted-in SQL Heist operatives ranked by client-submitted objectives cleared.',
})

export default function LeaderboardPage() {
  return <LeaderboardTable />
}
