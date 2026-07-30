import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getLevel, getNextJobId, JOB_IDS } from '@/features/game/levels'
import { JobPlayer } from '@/features/game/components/JobPlayer'
import { SITE_NAME } from '@/app/siteConfig'

// Readable technique names for per-job SEO titles/descriptions.
const TECHNIQUE_LABEL: Record<string, string> = {
  'auth-bypass': 'authentication bypass',
  'comment-injection': 'comment injection',
  'column-count': 'column-count discovery',
  'union-extraction': 'UNION-based extraction',
  'schema-discovery': 'schema discovery',
  'error-based': 'error-based',
  'blind-boolean': 'blind boolean',
  'blind-timing': 'blind timing',
  'stacked-queries': 'stacked queries',
  'waf-bypass': 'WAF bypass',
}

// Per-job metadata: unique title + description per target (was: all 8 shared the
// root title). Static export bakes these into each prerendered job page's <head>.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ jobId: string }>
}): Promise<Metadata> {
  const { jobId } = await params
  const level = getLevel(jobId)
  if (!level) return {}
  const technique = TECHNIQUE_LABEL[level.technique] ?? 'SQL injection'
  const description = `${level.brief.objective} A hands-on ${technique} SQL-injection job in ${SITE_NAME}.`
  return {
    title: level.title,
    description,
    alternates: { canonical: `/jobs/${jobId}` },
    openGraph: { type: 'article', title: `${level.title} · ${SITE_NAME}`, description, url: `/jobs/${jobId}` },
  }
}

// Job player route (Server Component). Pre-renders every job at build time; each
// level JSON is validated through the frozen engine's parseLevel (in the levels
// registry) and passed to the client <JobPlayer>. The engine/WASM is dynamically
// imported inside JobPlayer, so this route prerenders without WASM.
export function generateStaticParams() {
  return JOB_IDS.map((jobId) => ({ jobId }))
}

export const dynamicParams = false

export default async function JobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const level = getLevel(jobId)
  if (!level) notFound()

  return <JobPlayer level={level} nextJobId={getNextJobId(jobId)} />
}
