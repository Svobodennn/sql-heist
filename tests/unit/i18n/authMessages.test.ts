import { describe, expect, it } from 'vitest'
import en from '@/messages/en.json'
import tr from '@/messages/tr.json'
import pl from '@/messages/pl.json'

// Every locale must carry the IDENTICAL key set — a missing key would silently
// fall back to English (or the raw key) at runtime. Full-catalog scope on
// purpose: it also guards future namespaces (profile/leaderboard) for free.
function flattenKeys(tree: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return value !== null && typeof value === 'object'
      ? flattenKeys(value as Record<string, unknown>, path)
      : [path]
  })
}

describe('i18n catalogs stay in key parity (en/tr/pl)', () => {
  const enKeys = flattenKeys(en).sort()
  const trKeys = flattenKeys(tr).sort()
  const plKeys = flattenKeys(pl).sort()

  it('tr matches en exactly', () => {
    expect(trKeys).toEqual(enKeys)
  })

  it('pl matches en exactly', () => {
    expect(plKeys).toEqual(enKeys)
  })

  it('the auth namespace exists and is non-trivial', () => {
    const authKeys = enKeys.filter((k) => k.startsWith('auth.'))
    expect(authKeys.length).toBeGreaterThan(30)
    // Every AuthErrorCode surfaced by authClient has a message.
    for (const code of [
      'auth-disabled',
      'invalid-credentials',
      'email-not-confirmed',
      'user-exists',
      'weak-password',
      'rate-limited',
      'username-taken',
      'generic',
    ]) {
      expect(authKeys).toContain(`auth.errors.${code}`)
    }
  })
})
