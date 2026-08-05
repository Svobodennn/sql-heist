import type { MetadataRoute } from 'next'
import { CASE_IDS } from '@/features/game/cases'
import { SITE_URL } from './siteConfig'

// Required for metadata routes under `output: 'export'`.
export const dynamic = 'force-static'

// Static sitemap — under `output: 'export'` Next emits /sitemap.xml at build.
// The marketing/legal pages are statically generated per locale (en at the root,
// /tr and /pl variants), so each lists its language alternates (hreflang). The game
// shell (/cases + case routes) has no per-locale URL — its chrome is client-localized.
export default function sitemap(): MetadataRoute.Sitemap {
  const localized = ['', '/help', '/faq', '/privacy', '/terms', '/contact']
  const enOnly = ['/cases']

  const localizedEntries = localized.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: 'monthly' as const,
    priority: path === '' ? 1 : 0.6,
    alternates: {
      languages: {
        en: `${SITE_URL}${path}`,
        tr: `${SITE_URL}/tr${path}`,
        pl: `${SITE_URL}/pl${path}`,
      },
    },
  }))

  const enOnlyEntries = enOnly.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  const cases = CASE_IDS.map((id) => ({
    url: `${SITE_URL}/cases/${id}`,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  return [...localizedEntries, ...enOnlyEntries, ...cases]
}
