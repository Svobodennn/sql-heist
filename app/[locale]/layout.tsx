import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { AppShell } from '@/app/shell'
import { getServerTranslator } from '@/i18n/server'
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/app/siteConfig'

export function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'pl' }]
}

function localizedLocale(locale: string): 'tr' | 'pl' {
  if (locale !== 'tr' && locale !== 'pl') notFound()
  return locale
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const activeLocale = localizedLocale(locale)
  const t = getServerTranslator(activeLocale)
  const tagline = t('home.hero.tagline')
  const description = t('home.hero.lede')
  const title = `${SITE_NAME} — ${tagline}`

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s · ${SITE_NAME}` },
    description,
    applicationName: SITE_NAME,
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      url: `/${activeLocale}`,
      title,
      description,
      // Explicit metadataBase-relative image so the URL resolves to SITE_URL, not the
      // Vercel deployment host the file-convention opengraph-image would otherwise use.
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
    robots: { index: true, follow: true },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  return <AppShell locale={localizedLocale(locale)}>{children}</AppShell>
}
