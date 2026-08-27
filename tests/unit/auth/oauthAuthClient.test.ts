// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSupabaseMock, signInWithOAuthMock } = vi.hoisted(() => ({
  getSupabaseMock: vi.fn(),
  signInWithOAuthMock: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({ getSupabase: getSupabaseMock }))

import { completeOAuthAttempt } from '@/features/auth/oauthFlow'
import { signInOAuth } from '@/features/auth/authClient'

describe('signInOAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
    window.localStorage.clear()
    getSupabaseMock.mockReturnValue({ auth: { signInWithOAuth: signInWithOAuthMock } })
    signInWithOAuthMock.mockResolvedValue({
      data: { url: 'https://provider.example' },
      error: null,
    })
  })

  it('starts a PKCE provider redirect through the canonical static callback', async () => {
    await expect(signInOAuth('github', { purpose: 'sign-in', returnTo: '/tr' })).resolves.toEqual(
      {},
    )

    expect(signInWithOAuthMock).toHaveBeenCalledWith({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    expect(completeOAuthAttempt('user-1')).toBe('/tr')
  })

  it.each([
    ['google', 'consent select_account'],
    ['github', 'select_account'],
  ] as const)(
    'forces provider interaction for %s deletion re-verification',
    async (provider, prompt) => {
      await expect(
        signInOAuth(provider, {
          purpose: 'account-deletion',
          returnTo: '/account',
          expectedUserId: 'user-1',
        }),
      ).resolves.toEqual({})

      expect(signInWithOAuthMock).toHaveBeenCalledWith({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt },
        },
      })
    },
  )

  it('does not leave a return intent behind when the provider launch fails', async () => {
    signInWithOAuthMock.mockResolvedValueOnce({
      data: { url: null },
      error: { message: 'provider unavailable', status: 503 },
    })

    await expect(
      signInOAuth('google', { purpose: 'sign-in', returnTo: '/account' }),
    ).resolves.toEqual({ error: 'generic' })
    expect(completeOAuthAttempt('user-1')).toBe('/')
  })

  it('fails closed before provider navigation when same-tab OAuth state cannot be stored', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage disabled', 'QuotaExceededError')
    })

    try {
      await expect(
        signInOAuth('google', { purpose: 'sign-in', returnTo: '/account' }),
      ).resolves.toEqual({ error: 'generic' })
    } finally {
      setItem.mockRestore()
    }

    expect(signInWithOAuthMock).not.toHaveBeenCalled()
  })

  it('degrades cleanly when Supabase is not configured', async () => {
    getSupabaseMock.mockReturnValue(null)

    await expect(signInOAuth('google', { purpose: 'sign-in', returnTo: '/' })).resolves.toEqual({
      error: 'auth-disabled',
    })
    expect(signInWithOAuthMock).not.toHaveBeenCalled()
  })
})
