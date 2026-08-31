import { describe, expect, it } from 'vitest'
import { pageAlternates, pageMeta } from '@/app/localeMeta'
import { SITE_NAME, SITE_TAGLINE } from '@/app/siteConfig'

describe('pageMeta', () => {
  it('binds canonical, Open Graph, and Twitter metadata to the localized page', () => {
    const title = 'İş nasıl işler'
    const description = 'Her işin beş hamlesini öğren.'

    expect(pageMeta('/help', 'tr', { title, description })).toEqual({
      title,
      description,
      alternates: pageAlternates('/help', 'tr'),
      openGraph: {
        type: 'website',
        siteName: SITE_NAME,
        url: '/tr/help',
        title,
        description,
        images: [
          {
            url: '/opengraph-image.png',
            width: 1200,
            height: 630,
            type: 'image/png',
            alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [
          {
            url: '/twitter-image.png',
            width: 1200,
            height: 630,
            type: 'image/png',
            alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
          },
        ],
      },
    })
  })

  it('preserves article metadata for case pages', () => {
    const metadata = pageMeta('/cases/the-front-door', 'en', {
      title: 'Case 001 — The Front Door',
      description: 'Breach the first case.',
      type: 'article',
    })

    expect(metadata.openGraph).toMatchObject({
      type: 'article',
      url: '/cases/the-front-door',
    })
  })
})
