import type { ReactNode } from 'react'
import type { Locale } from '@/i18n/config'
import { I18nProvider } from '@/i18n/I18nProvider'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { UsernameGate } from '@/features/auth/UsernameGate'
import { CinematicCursor } from '@/app/components/CinematicCursor'
import { CookieConsent } from '@/app/components/CookieConsent'
import { Footer } from '@/app/components/Footer'
import { Navbar } from '@/app/components/Navbar'
import { fontVariables } from './fonts'
import styles from './AppShell.module.css'
import '@/app/globals.css'

interface AppShellProps {
  readonly locale: Locale
  readonly children: ReactNode
}

export function AppShell({ locale, children }: AppShellProps) {
  return (
    <html lang={locale} className={fontVariables}>
      <body>
        <a href="#main-content" className={styles.skipLink}>
          Skip to content
        </a>
        <I18nProvider>
          <AuthProvider>
            <div className={styles.chrome}>
              <Navbar />
              <div id="main-content" tabIndex={-1} className={styles.main}>
                {children}
              </div>
              <Footer />
            </div>
            <CookieConsent />
            <UsernameGate />
            <CinematicCursor />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
