import type { Metadata } from 'next'
import { LeaderboardTable } from '@/features/leaderboard'
import type { Locale } from '@/i18n/config'
import { getServerTranslator } from '@/i18n/server'
import { pageAlternates } from '../../localeMeta'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const activeLocale = locale as Locale
  const t = getServerTranslator(activeLocale)
  return {
    title: t('leaderboard.title'),
    description: t('leaderboard.intro'),
    alternates: pageAlternates('/leaderboard', activeLocale),
  }
}

export default function LocaleLeaderboardPage() {
  return <LeaderboardTable />
}
