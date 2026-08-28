import { describe, expect, it } from 'vitest'
import type { User } from '@supabase/supabase-js'
import {
  getEmailSignupUsername,
  getOAuthProviders,
  hasEmailIdentity,
  suggestOAuthUsername,
} from '@/features/auth/oauthProfile'

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-08-26T00:00:00.000Z',
    ...overrides,
  }
}

describe('OAuth profile helpers', () => {
  it('detects only supported linked OAuth identities without duplicates', () => {
    const user = makeUser({
      app_metadata: { provider: 'google', providers: ['email', 'google', 'github'] },
      identities: [{ provider: 'google' }, { provider: 'github' }] as User['identities'],
    })

    expect(getOAuthProviders(user)).toEqual(['google', 'github'])
    expect(hasEmailIdentity(user)).toBe(true)
  })

  it('normalizes a GitHub handle into a private username suggestion', () => {
    const user = makeUser({
      app_metadata: { provider: 'github', providers: ['github'] },
      user_metadata: { user_name: 'Café-Noir___Detective' },
    })

    expect(suggestOAuthUsername(user)).toBe('cafe_noir_detective')
  })

  it('falls back to a Google display name and rejects unusable suggestions', () => {
    const google = makeUser({
      app_metadata: { provider: 'google', providers: ['google'] },
      user_metadata: { full_name: '  Ada Lovelace  ' },
    })
    const unusable = makeUser({
      app_metadata: { provider: 'github', providers: ['github'] },
      user_metadata: { user_name: '李' },
    })

    expect(suggestOAuthUsername(google)).toBe('ada_lovelace')
    expect(suggestOAuthUsername(unusable)).toBe('')
    expect(hasEmailIdentity(unusable)).toBe(false)
  })

  it('returns an automatic claim only for an email identity username', () => {
    const emailUser = makeUser({
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { username: 'Neo_01' },
    })
    const oauthUser = makeUser({
      app_metadata: { provider: 'github', providers: ['github'] },
      user_metadata: { username: 'Provider_Name' },
    })

    expect(getEmailSignupUsername(emailUser)).toBe('Neo_01')
    expect(getEmailSignupUsername(oauthUser)).toBe('')
  })
})
