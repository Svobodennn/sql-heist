'use client'

import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, isLocale, type Locale } from './config'
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

// Client locale provider. Mounted once in the root layout, wrapping every route's
// (server-rendered) children — React context flows to all Client Components below,
// even across Server Component boundaries.
//
// Hydration safety: the initial render ALWAYS uses DEFAULT_LOCALE, matching the
// statically exported HTML. Only AFTER mount do we read the persisted choice from
// localStorage and (if different) re-render — so there is never a server/client
// markup mismatch, and the default-locale export stays byte-identical.
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
      if (isLocale(stored) && stored !== locale) {
        setLocaleState(stored)
        document.documentElement.lang = stored
      }
    } catch {
      // Private mode / storage disabled — silently keep the default locale.
    }
    // Run once on mount; `locale` is the default here by construction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next)
    } catch {
      // Ignore persistence failures; the in-memory switch still works this session.
    }
    document.documentElement.lang = next
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
