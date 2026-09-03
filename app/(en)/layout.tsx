import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AppShell } from '@/app/shell'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/app/siteConfig'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
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
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
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

export default function EnglishLayout({ children }: { children: ReactNode }) {
  return <AppShell locale="en">{children}</AppShell>
}
