import type { Metadata } from 'next'
import type { Locale } from '@/i18n/config'
import { getServerTranslator } from '@/i18n/server'
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/app/siteConfig'

export function publicProfileShellMetadata(locale: Locale): Metadata {
  const t = getServerTranslator(locale)
  const title = t('profile.stamp')
  const description = t('profile.emptyBody')
  const socialImageAlt = `${SITE_NAME} — ${SITE_TAGLINE}`

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title,
      description,
      images: [
        {
          url: `${SITE_URL}/opengraph-image.png`,
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
          url: `${SITE_URL}/twitter-image.png`,
          width: 1200,
          height: 630,
          type: 'image/png',
          alt: socialImageAlt,
        },
      ],
    },
  }
}
