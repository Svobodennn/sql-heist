// Locale configuration. en/tr/pl are all LTR (no RTL handling needed). `en` is
// the default and the fallback everywhere; tr/pl ship as en-cloned stubs until a
// translation pass lands real values.

export const LOCALES = ['en', 'tr', 'pl'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

// Native language names for the switcher (each written in its own language).
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  tr: 'Türkçe',
  pl: 'Polski',
}

// Short badge shown in the switcher trigger.
export const LOCALE_SHORT: Record<Locale, string> = {
  en: 'EN',
  tr: 'TR',
  pl: 'PL',
}

// localStorage key for the persisted choice. Deliberately distinct from the
// progress key (sql-heist:progress:v1) the game/E2E already use.
export const LOCALE_STORAGE_KEY = 'sql-heist:locale'

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}
