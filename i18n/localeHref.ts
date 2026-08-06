import type { Locale } from './config'

// Paths that have per-locale static variants (see app/[locale]/**) — the marketing
// pages AND the game (/cases, /cases/[caseId]). This helper is shared by app chrome
// (Navbar/Footer/landing) AND game components (CasePlayer/CaseBoard/…), so it lives
// in i18n — a layer both `app` and `features` may import — NOT in `app` (a
// features→app import would break the one-way layering).
const LOCALIZED_ROOTS = new Set(['', 'help', 'faq', 'privacy', 'terms', 'contact', 'cases'])

// Rewrite an internal href for the current locale so navigation STAYS in-language:
// on /tr, `/help` → `/tr/help`, `/cases/x` → `/tr/cases/x`, `/` → `/tr`. Leaves en
// unprefixed, and leaves anchors, mailto/external, and non-localized paths untouched.
// Pure — safe in both Server and Client Components.
export function localeHref(path: string, locale: Locale): string {
  if (locale === 'en') return path
  if (!path.startsWith('/')) return path // #anchor, mailto:, https://…
  const seg = path.split('/')[1] ?? ''
  if (!LOCALIZED_ROOTS.has(seg)) return path
  return path === '/' ? `/${locale}` : `/${locale}${path}`
}
