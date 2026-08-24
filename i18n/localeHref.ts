import type { Locale } from './config'

// Paths that have per-locale static variants (see app/[locale]/**) — the marketing
// pages AND the game (/cases, /cases/[caseId]). This helper is shared by app chrome
// (Navbar/Footer/landing) AND game components (CasePlayer/CaseBoard/…), so it lives
// in i18n — a layer both `app` and `features` may import — NOT in `app` (a
// features→app import would break the one-way layering).
const LOCALIZED_ROOTS = new Set([
  '',
  'help',
  'faq',
  'privacy',
  'terms',
  'contact',
  'cases',
  'leaderboard',
  'account',
  'u',
])

// Email confirmation must stay on the exact Supabase allow-listed callback.
// Sign-in and sign-up, however, have static /tr and /pl variants so collection
// notices and navigation stay in the visitor's active language.
const LOCALIZED_AUTH_PATHS = new Set(['/auth/sign-in', '/auth/sign-up'])

// Rewrite an internal href for the current locale so navigation STAYS in-language:
// on /tr, `/help` → `/tr/help`, `/cases/x` → `/tr/cases/x`, `/` → `/tr`. Leaves en
// unprefixed, and leaves anchors, mailto/external, and non-localized paths untouched.
// Pure — safe in both Server and Client Components.
export function localeHref(path: string, locale: Locale): string {
  if (locale === 'en') return path
  if (!path.startsWith('/')) return path // #anchor, mailto:, https://…
  const pathname = path.split(/[?#]/, 1)[0] ?? path
  if (LOCALIZED_AUTH_PATHS.has(pathname)) return `/${locale}${path}`
  const seg = path.slice(1).split(/[/?#]/, 1)[0] ?? ''
  if (!LOCALIZED_ROOTS.has(seg)) return path
  return path === '/' ? `/${locale}` : `/${locale}${path}`
}

// Build the same logical destination when the visitor changes language. Unlike
// usePathname(), the explicit search/hash inputs preserve state such as the
// public-profile `?name=` lookup and the Supabase callback code. Delegating the
// final rewrite to localeHref also keeps non-localized routes (notably the exact
// allow-listed /auth/callback) canonical.
export function switchLocaleHref(
  pathname: string,
  search: string,
  hash: string,
  locale: Locale,
): string {
  const parts = pathname.split('/')
  const hasLocalePrefix = parts[1] === 'tr' || parts[1] === 'pl'
  const rest = (hasLocalePrefix ? parts.slice(2) : parts.slice(1)).join('/')
  const unprefixedPath = rest ? `/${rest}` : '/'
  const normalizedSearch = search && !search.startsWith('?') ? `?${search}` : search
  const normalizedHash = hash && !hash.startsWith('#') ? `#${hash}` : hash

  return localeHref(`${unprefixedPath}${normalizedSearch}${normalizedHash}`, locale)
}
