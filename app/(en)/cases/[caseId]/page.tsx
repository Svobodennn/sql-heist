import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CASE_IDS, getCase } from '@/features/game/cases'
import { CasePlayer } from '@/features/game/components/CasePlayer'
import { JsonLd } from '@/app/components/JsonLd'
import { pageMeta } from '@/app/localeMeta'
import { buildBreadcrumbList } from '@/app/structuredData'
import { getServerTranslator } from '@/i18n/server'

// Per-case metadata: a unique title + description per breach. The static export
// bakes these into each prerendered case page's <head>.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ caseId: string }>
}): Promise<Metadata> {
  const { caseId } = await params
  const gameCase = getCase(caseId)
  if (!gameCase) return {}
  const description = gameCase.briefing.text
  const title = `Case ${gameCase.number} — ${gameCase.title}`
  return pageMeta(`/cases/${caseId}`, 'en', {
    title,
    description,
    type: 'article',
  })
}

// Case player route (Server Component). Pre-renders every case at build time; each
// case JSON is validated through the frozen schema's parseCase (in the registry)
// and passed to the client <CasePlayer>. The engine/WASM is dynamically imported
// inside CasePlayer, so this route prerenders without WASM.
export function generateStaticParams() {
  return CASE_IDS.map((caseId) => ({ caseId }))
}

export const dynamicParams = false

export default async function CasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params
  const gameCase = getCase(caseId)
  if (!gameCase) notFound()

  const t = getServerTranslator('en')
  const breadcrumbLd = buildBreadcrumbList('en', [
    { name: t('nav.home'), path: '/' },
    { name: t('nav.jobs'), path: '/cases' },
    {
      name: `${t('game.case.header.number', { number: gameCase.number })} — ${gameCase.title}`,
      path: `/cases/${caseId}`,
    },
  ])

  return (
    <>
      <JsonLd data={breadcrumbLd} />
      <CasePlayer gameCase={gameCase} />
    </>
  )
}
