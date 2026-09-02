import type { Metadata } from 'next'
import type { Locale } from '@/i18n/config'
import { getServerTranslator } from '@/i18n/server'
import { getCaseMetas } from '@/features/game/cases'
import { CaseBoard } from '@/features/game/components/CaseBoard'
import { JsonLd } from '@/app/components/JsonLd'
import { buildBreadcrumbList } from '@/app/structuredData'
import { pageMeta } from '../../localeMeta'

// The /tr and /pl case board. Same client <CaseBoard>; the metadata (localized case
// titles) is derived server-side from the locale param.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const activeLocale = locale as Locale
  const t = getServerTranslator(activeLocale)
  return pageMeta('/cases', activeLocale, {
    title: t('game.board.title'),
    description: t('game.board.sub'),
  })
}

export default async function LocaleCaseBoard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const activeLocale = locale as Locale
  const t = getServerTranslator(activeLocale)
  const breadcrumbLd = buildBreadcrumbList(activeLocale, [
    { name: t('nav.home'), path: '/' },
    { name: t('nav.jobs'), path: '/cases' },
  ])

  return (
    <>
      <JsonLd data={breadcrumbLd} />
      <CaseBoard cases={getCaseMetas(activeLocale)} />
    </>
  )
}
