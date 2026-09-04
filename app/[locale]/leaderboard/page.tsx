import type { Metadata } from 'next'
import { LeaderboardTable } from '@/features/leaderboard'
import { JsonLd } from '@/app/components/JsonLd'
import type { Locale } from '@/i18n/config'
import { getServerTranslator } from '@/i18n/server'
import { buildBreadcrumbList } from '@/app/structuredData'
import { pageMeta } from '../../localeMeta'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const activeLocale = locale as Locale
  const t = getServerTranslator(activeLocale)
  return pageMeta('/leaderboard', activeLocale, {
    title: t('leaderboard.title'),
    description: t('leaderboard.intro'),
  })
}

export default async function LocaleLeaderboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const activeLocale = locale as Locale
  const t = getServerTranslator(activeLocale)
  const breadcrumbLd = buildBreadcrumbList(activeLocale, [
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
