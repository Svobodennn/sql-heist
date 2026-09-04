'use client'

import { createContext, useCallback, useMemo, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, type Locale } from './config'
import { EN_MESSAGES, getMessages } from './messages'
import { createTranslator, type Translator } from './translate'

export interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Translator
}

// Default context is bound to the DEFAULT locale so a consumer rendered outside a
// provider (or during the very first paint) still returns English — never a blank
// or a raw key.
export const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: createTranslator(EN_MESSAGES, EN_MESSAGES),
})

// The URL prefix is the SINGLE source of truth for locale. Every localizable route
// exists as en (unprefixed) + /tr + /pl static variants — marketing pages AND the
// game (/cases). So locale is a pure function of the pathname's first segment, known
// identically at static prerender and at hydration → the prerendered /tr, /pl chrome
// and its hydration always agree (no mismatch, no flash).
function urlLocaleOf(pathname: string): Locale {
  const seg = pathname.split('/')[1]
  return seg === 'tr' || seg === 'pl' ? seg : DEFAULT_LOCALE
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/'
  const locale = urlLocaleOf(pathname)

  // The switcher navigates between independently rendered locale roots. Persist the
  // preference here; the destination document supplies its build-time <html lang>.
  const setLocale = useCallback((next: Locale) => {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next)
    } catch {
      // Private mode / storage disabled — ignore.
    }
  }, [])

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: createTranslator(getMessages(locale), EN_MESSAGES),
    }),
    [locale, setLocale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
