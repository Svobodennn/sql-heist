import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Anton, Geist, Geist_Mono, Space_Grotesk } from 'next/font/google'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { CookieConsent } from './components/CookieConsent'
import { I18nProvider } from '@/i18n/I18nProvider'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { UsernameGate } from '@/features/auth/UsernameGate'
import { CinematicCursor } from './components/CinematicCursor'
import { SITE_URL, SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION } from './siteConfig'
import styles from './layout.module.css'
import './globals.css'

// Fonts (docs/04-frontend-ux.md §1.4). Inter is BANNED. Anton = brand/hero display
// (Neon Noir wordmark), Space Grotesk = section headings, Geist Sans = body, Geist
// Mono = code surface (ligatures switched OFF in CSS so `--`, `<>`, `!=` stay literal
// — critical for the injection lesson). next/font self-hosts these at build time, so
// the static export ships no runtime font CDN.
const brand = Anton({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-brand-src',
})
const display = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display-src',
})
const sans = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans-src',
})
const mono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono-src',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${brand.variable} ${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body>
        <a href="#main-content" className={styles.skipLink}>
          Skip to content
        </a>
        <I18nProvider>
          {/* AuthProvider sits INSIDE I18nProvider so auth UI can translate. With
              no Supabase env it is a pass-through ('disabled') — anonymous play
              never touches it. */}
          <AuthProvider>
            <div className={styles.chrome}>
              <Navbar />
              <div id="main-content" tabIndex={-1} className={styles.main}>
                {children}
              </div>
              <Footer />
            </div>
            <CookieConsent />
            {/* Renders nothing until an authed user has no profiles row yet. */}
            <UsernameGate />
            <CinematicCursor />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
