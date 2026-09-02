import type { Metadata } from 'next'
import { LeaderboardTable } from '@/features/leaderboard'
import { JsonLd } from '@/app/components/JsonLd'
import { pageMeta } from '@/app/localeMeta'
import { buildBreadcrumbList } from '@/app/structuredData'
import { getServerTranslator } from '@/i18n/server'

export const metadata: Metadata = pageMeta('/leaderboard', 'en', {
  title: 'Casual leaderboard',
  description: 'Opted-in SQL Heist operatives ranked by client-submitted objectives cleared.',
})

export default function LeaderboardPage() {
  const t = getServerTranslator('en')
  const breadcrumbLd = buildBreadcrumbList('en', [
    { name: t('nav.home'), path: '/' },
    { name: t('nav.leaderboard'), path: '/leaderboard' },
  ])

  return (
    <>
      <JsonLd data={breadcrumbLd} />
      <LeaderboardTable />
    </>
  )
}
