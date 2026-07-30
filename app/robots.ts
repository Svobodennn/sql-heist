import type { MetadataRoute } from 'next'
import { SITE_URL } from './siteConfig'

// Required for metadata routes under `output: 'export'`.
export const dynamic = 'force-static'

// Static robots.txt (emitted at build under `output: 'export'`). Everything is
// public and indexable; point crawlers at the sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
