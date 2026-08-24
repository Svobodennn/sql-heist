import { describe, expect, it } from 'vitest'
import { localeHref, switchLocaleHref } from '@/i18n/localeHref'

describe('localeHref', () => {
  it('keeps English routes unprefixed', () => {
    expect(localeHref('/leaderboard', 'en')).toBe('/leaderboard')
    expect(localeHref('/account', 'en')).toBe('/account')
    expect(localeHref('/u?name=ada_l', 'en')).toBe('/u?name=ada_l')
  })

  it('localizes account, leaderboard, and query-param profile routes', () => {
    expect(localeHref('/leaderboard', 'tr')).toBe('/tr/leaderboard')
    expect(localeHref('/account', 'pl')).toBe('/pl/account')
    expect(localeHref('/u?name=ada_l', 'tr')).toBe('/tr/u?name=ada_l')
  })

  it('localizes interactive auth pages but keeps the callback canonical', () => {
    expect(localeHref('/auth/sign-in', 'tr')).toBe('/tr/auth/sign-in')
    expect(localeHref('/auth/sign-up?from=account', 'pl')).toBe('/pl/auth/sign-up?from=account')
    expect(localeHref('/auth/callback?code=secret', 'tr')).toBe('/auth/callback?code=secret')
  })

  it('leaves external destinations untouched', () => {
    expect(localeHref('mailto:crew@example.com', 'pl')).toBe('mailto:crew@example.com')
    expect(localeHref('https://example.com', 'tr')).toBe('https://example.com')
  })

  it('switches locale prefixes without dropping query or hash state', () => {
    expect(switchLocaleHref('/u', '?name=ada_l', '#dossier', 'tr')).toBe(
      '/tr/u?name=ada_l#dossier',
    )
    expect(switchLocaleHref('/tr/u', '?name=ada_l', '', 'pl')).toBe('/pl/u?name=ada_l')
    expect(switchLocaleHref('/pl/u', '?name=ada_l', '', 'en')).toBe('/u?name=ada_l')
  })

  it('keeps non-localized callback routes canonical while switching language', () => {
    expect(switchLocaleHref('/auth/callback', '?code=secret', '#complete', 'tr')).toBe(
      '/auth/callback?code=secret#complete',
    )
  })
})
