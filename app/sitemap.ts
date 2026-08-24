import type { MetadataRoute } from 'next'
import { CASE_IDS } from '@/features/game/cases'
import { SITE_URL } from './siteConfig'

// Required for metadata routes under `output: 'export'`.
export const dynamic = 'force-static'

// Static sitemap — under `output: 'export'` Next emits /sitemap.xml at build. Every
// page is statically generated per locale (en at the root, /tr + /pl variants), so
// each entry lists its language alternates (hreflang) — the marketing/legal pages
// and the whole game (board + each case).
export default function sitemap(): MetadataRoute.Sitemap {
  const languages = (path: string) => ({
    en: `${SITE_URL}${path}`,
    tr: `${SITE_URL}/tr${path}`,
    pl: `${SITE_URL}/pl${path}`,
  })

  const marketing = ['', '/help', '/faq', '/leaderboard', '/privacy', '/terms', '/contact']
  const marketingEntries = marketing.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: 'monthly' as const,
    priority: path === '' ? 1 : 0.6,
    alternates: { languages: languages(path) },
  }))

  const board = {
    url: `${SITE_URL}/cases`,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
    alternates: { languages: languages('/cases') },
  }

  const cases = CASE_IDS.map((id) => ({
    url: `${SITE_URL}/cases/${id}`,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
    alternates: { languages: languages(`/cases/${id}`) },
  }))

  return [...marketingEntries, board, ...cases]
}
