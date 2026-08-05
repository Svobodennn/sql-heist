import type { Locale } from '@/i18n/config'

// Paths that have per-locale static variants (see app/[locale]/**). The game
// (/cases) is NOT here — it stays unprefixed and reads the locale client-side.
const LOCALIZED_ROOTS = new Set(['', 'help', 'faq', 'privacy', 'terms', 'contact'])

// Rewrite an internal href for the current locale so navigation STAYS in-language:
// on /tr, `/help` → `/tr/help`, `/` → `/tr`. Leaves en unprefixed, and leaves
// anchors, mailto/external, and non-localized paths (/cases…) untouched. Pure —
// safe in both Server and Client Components.
export function localeHref(path: string, locale: Locale): string {
  if (locale === 'en') return path
  if (!path.startsWith('/')) return path // #anchor, mailto:, https://…
  const seg = path.split('/')[1] ?? ''
  if (!LOCALIZED_ROOTS.has(seg)) return path // /cases and anything else
  return path === '/' ? `/${locale}` : `/${locale}${path}`
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
