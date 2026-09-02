import { normalizeUsername, validateUsername } from '@/features/auth/validation'
import type { Locale } from '@/i18n/config'

export interface PublicProfilePath {
  readonly locale: Locale
  readonly username: string
  readonly canonicalPath: string
}

export function publicProfileHref(username: string, locale: Locale): string {
  const segment = encodeURIComponent(normalizeUsername(username))
  const prefix = locale === 'en' ? '' : `/${locale}`
  return `${prefix}/user/${segment}`
}

export function parsePublicProfilePath(pathname: string): PublicProfilePath | null {
  const cleanPath = pathname.split(/[?#]/, 1)[0] ?? pathname
  const match = cleanPath.match(/^\/(?:(tr|pl)\/)?user\/([^/]+)$/)
  if (!match) return null

  let username: string
  try {
    username = normalizeUsername(decodeURIComponent(match[2]))
  } catch {
    return null
  }

  if (validateUsername(username)) return null

  const locale = (match[1] ?? 'en') as Locale
  return {
    locale,
    username,
    canonicalPath: publicProfileHref(username, locale),
  }
}
