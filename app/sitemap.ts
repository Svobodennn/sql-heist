import type { MetadataRoute } from 'next'
import { JOB_IDS } from '@/features/game/levels'
import { SITE_URL } from './siteConfig'

// Required for metadata routes under `output: 'export'`.
export const dynamic = 'force-static'

// Static sitemap — under `output: 'export'` Next emits /sitemap.xml at build.
// Lists the marketing/legal pages plus every job route (from the levels registry,
// so a new level appears automatically).
export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = ['', '/jobs', '/help', '/faq', '/privacy', '/terms', '/contact']
  const pages = staticPaths.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: 'monthly' as const,
    priority: path === '' ? 1 : 0.6,
  }))
  const jobs = JOB_IDS.map((id) => ({
    url: `${SITE_URL}/jobs/${id}`,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))
  return [...pages, ...jobs]
}
