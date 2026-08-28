// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBrowserAuthStorage, createSafeAuthStorage } from '@/lib/supabase/client'

describe('safe Supabase auth storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('persists the Supabase session but strips OAuth provider credentials recursively', async () => {
    const storage = createSafeAuthStorage(window.localStorage)
    await storage.setItem(
      'session',
      JSON.stringify({
        access_token: 'supabase-access',
        refresh_token: 'supabase-refresh',
        provider_token: 'google-access',
        provider_refresh_token: 'google-refresh',
        user: {
          user_metadata: {
            name: 'Ada',
            provider_token: 'unexpected-nested-token',
          },
        },
      }),
    )

    expect(JSON.parse(window.localStorage.getItem('session') ?? '{}')).toEqual({
      access_token: 'supabase-access',
      refresh_token: 'supabase-refresh',
      user: { user_metadata: { name: 'Ada' } },
    })
  })

  it('removes provider credentials from a legacy value when it is read', async () => {
    window.localStorage.setItem(
      'session',
      JSON.stringify({ access_token: 'supabase-access', provider_token: 'legacy-provider-token' }),
    )
    const storage = createSafeAuthStorage(window.localStorage)

    expect(storage.getItem('session')).toBe(JSON.stringify({ access_token: 'supabase-access' }))
    expect(window.localStorage.getItem('session')).toBe(
      JSON.stringify({ access_token: 'supabase-access' }),
    )
  })

  it('leaves PKCE verifier strings and malformed third-party values unchanged', async () => {
    const storage = createSafeAuthStorage(window.localStorage)
    await storage.setItem('pkce', JSON.stringify('verifier/provider_token'))
    await storage.setItem('foreign', 'not-json')

    expect(storage.getItem('pkce')).toBe(JSON.stringify('verifier/provider_token'))
    expect(storage.getItem('foreign')).toBe('not-json')
  })

  it('falls back to isolated memory when browser persistence is unavailable', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('Storage disabled', 'SecurityError')
      },
    })

    try {
      const storage = createBrowserAuthStorage()
      expect(storage).toBeDefined()
      storage?.setItem(
        'session',
        JSON.stringify({ access_token: 'supabase-access', provider_token: 'google-access' }),
      )
      expect(storage?.getItem('session')).toBe(JSON.stringify({ access_token: 'supabase-access' }))
    } finally {
      if (descriptor) Object.defineProperty(window, 'localStorage', descriptor)
    }
  })

  it('falls back to isolated memory when browser persistence rejects writes', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage disabled', 'QuotaExceededError')
    })

    let storage: ReturnType<typeof createBrowserAuthStorage>
    try {
      storage = createBrowserAuthStorage()
    } finally {
      setItem.mockRestore()
    }

    storage?.setItem(
      'session',
      JSON.stringify({ access_token: 'supabase-access', provider_token: 'google-access' }),
    )
    expect(window.localStorage.getItem('session')).toBeNull()
    expect(storage?.getItem('session')).toBe(JSON.stringify({ access_token: 'supabase-access' }))
  })
})
