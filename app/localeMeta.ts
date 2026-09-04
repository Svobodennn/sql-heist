import type { Metadata } from 'next'
import type { Locale } from '@/i18n/config'
import { SITE_NAME, SITE_TAGLINE } from '@/app/siteConfig'

interface PageMetaContent {
  readonly title: string
  readonly description: string
  readonly type?: 'website' | 'article'
}

// Reciprocal hreflang + self-canonical for a page that exists at the unprefixed en
// root and under /tr, /pl. `base` is the path without any locale prefix ('' = home,
// '/help', …). Every variant advertises the same language map + x-default (en), and
// points its canonical at itself — the shape Google wants for alternate pages.
export function pageAlternates(base: string, locale: Locale) {
  const url = (l: Locale) => (l === 'en' ? base || '/' : `/${l}${base}`)
  return {
    canonical: url(locale),
    languages: {
      'x-default': url('en'),
      en: url('en'),
      tr: url('tr'),
      pl: url('pl'),
    },
  }
}

export function pageMeta(
  base: string,
  locale: Locale,
  { title, description, type = 'website' }: PageMetaContent,
): Metadata {
  const alternates = pageAlternates(base, locale)
  const socialImageAlt = `${SITE_NAME} — ${SITE_TAGLINE}`

  return {
    title,
    description,
    alternates,
    openGraph: {
      type,
      siteName: SITE_NAME,
      url: alternates.canonical,
      title,
      description,
      images: [
        {
          url: '/opengraph-image.png',
          width: 1200,
          height: 630,
          type: 'image/png',
          alt: socialImageAlt,
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
          alt: socialImageAlt,
        },
      ],
    },
  }
}
