import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { Locale } from '@/i18n/config'
import { CASE_IDS, getCase } from '@/features/game/cases'
import { CasePlayer } from '@/features/game/components/CasePlayer'
import { JsonLd } from '@/app/components/JsonLd'
import { SITE_URL } from '@/app/siteConfig'
import { pageMeta } from '@/app/localeMeta'

// The /tr and /pl case player. Same client <CasePlayer>; the full Case is loaded
// server-side with the locale so its narrative (title/briefing/objectives/hints/
// debrief) is the translated overlay — SQL/code stays English (see caseNarrative).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; caseId: string }>
}): Promise<Metadata> {
  const { locale, caseId } = await params
  const gameCase = getCase(caseId, locale as Locale)
  if (!gameCase) return {}
  const description = gameCase.briefing.text
  const title = `Case ${gameCase.number} — ${gameCase.title}`
  return pageMeta(`/cases/${caseId}`, locale as Locale, {
    title,
    description,
    type: 'article',
  })
}

// Cross-producted with the [locale] segment's params (tr, pl) → /tr/cases/<id>,
// /pl/cases/<id> for every case, prerendered at build.
export function generateStaticParams() {
  return CASE_IDS.map((caseId) => ({ caseId }))
}

export const dynamicParams = false

export default async function LocaleCasePage({
  params,
}: {
  params: Promise<{ locale: string; caseId: string }>
}) {
  const { locale, caseId } = await params
  const gameCase = getCase(caseId, locale as Locale)
  if (!gameCase) notFound()

  const base = `${SITE_URL}/${locale}`
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: base },
      { '@type': 'ListItem', position: 2, name: 'Cases', item: `${base}/cases` },
      {
        '@type': 'ListItem',
        position: 3,
        name: `Case ${gameCase.number} — ${gameCase.title}`,
        item: `${base}/cases/${caseId}`,
      },
    ],
  }

  return (
    <>
      <JsonLd data={breadcrumbLd} />
      <CasePlayer gameCase={gameCase} />
    </>
  )
}
