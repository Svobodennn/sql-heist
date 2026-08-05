'use client'

import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
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

// The URL prefix is the source of truth for locale on the per-locale static routes
// (/tr, /pl → those languages). Anything else resolves to the DEFAULT here; the game
// routes (/cases) additionally fall back to the client's stored choice, since their
// chrome is client-rendered and has no per-locale URL. See LanguageSwitcher: it
// navigates between prefixes on marketing pages and only setLocale()s on the game.
function urlLocaleOf(pathname: string): Locale | null {
  const seg = pathname.split('/')[1]
  return seg === 'tr' || seg === 'pl' ? seg : null
}
function isGamePath(pathname: string): boolean {
  return pathname.split('/')[1] === 'cases'
}

// Client locale provider. Mounted once in the root layout, wrapping every route's
// (server-rendered) children — React context flows to all Client Components below.
//
// Hydration safety: `stored` starts at DEFAULT on both the static prerender and the
// first client render, so markup matches; only AFTER mount do we read the persisted
// choice. The resolved locale is a pure function of the pathname (known identically
// at prerender and hydration via usePathname), so the prerendered /tr, /pl chrome
// and its hydration agree.
export function I18nProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/'
  const urlLocale = urlLocaleOf(pathname)
  const game = isGamePath(pathname)

  // The client's remembered choice — used only where the URL doesn't pin a locale
  // (the game routes), and to seed the switcher.
  const [stored, setStored] = useState<Locale>(DEFAULT_LOCALE)

  const locale: Locale = urlLocale ?? (game ? stored : DEFAULT_LOCALE)

  useEffect(() => {
    try {
      const s = window.localStorage.getItem(LOCALE_STORAGE_KEY)
      if (isLocale(s)) setStored(s)
    } catch {
      // Private mode / storage disabled — keep the default.
    }
  }, [])

  // Browsing a per-locale URL (/tr, /pl) is itself a language choice — remember it
  // so the unprefixed game routes (/cases) follow the same language afterwards.
  useEffect(() => {
    if (!urlLocale) return
    setStored(urlLocale)
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, urlLocale)
    } catch {
      // ignore persistence failures
    }
  }, [urlLocale])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    setStored(next)
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
