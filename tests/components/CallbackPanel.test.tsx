import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { AuthContext, type AuthContextValue } from '@/features/auth/AuthProvider'
import { consumeDeletionReauthReceipt, rememberOAuthAttempt } from '@/features/auth/oauthFlow'
import { I18nContext } from '@/i18n/I18nProvider'
import { createTranslator } from '@/i18n/translate'
import en from '@/messages/en.json'

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock, prefetch: vi.fn() }),
}))

vi.mock('@/features/auth/authClient', () => ({
  clearPendingEmail: vi.fn(),
  exchangeCode: vi.fn(async () => ({})),
  readPendingEmail: vi.fn(() => null),
  resendSignupEmail: vi.fn(async () => ({})),
  verifyEmailOtp: vi.fn(async () => ({})),
}))

import { CallbackPanel } from '@/features/auth/CallbackPanel'

function makeValue(userId = 'user-1'): AuthContextValue {
  return {
    user: { id: userId } as User,
    profile: null,
    profileReady: false,
    status: 'authed',
    signInEmail: vi.fn(async () => ({})),
    signUpEmail: vi.fn(async () => ({})),
    signOut: vi.fn(async () => {}),
    refreshProfile: vi.fn(async () => {}),
    adoptProfile: vi.fn(),
  }
}

function renderCallback(userId = 'user-1') {
  return render(
    <I18nContext.Provider value={{ locale: 'en', setLocale: vi.fn(), t: createTranslator(en, en) }}>
      <AuthContext.Provider value={makeValue(userId)}>
        <CallbackPanel />
      </AuthContext.Provider>
    </I18nContext.Provider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  window.sessionStorage.clear()
  window.history.replaceState(null, '', '/auth/callback')
})

afterEach(cleanup)

describe('<CallbackPanel>', () => {
  it('returns a completed localized OAuth sign-in to its internal destination', async () => {
    rememberOAuthAttempt('google', { purpose: 'sign-in', returnTo: '/tr' })

    renderCallback()

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/tr'))
  })

  it('creates a deletion reauth receipt only when the returning identity matches', async () => {
    rememberOAuthAttempt('github', {
      purpose: 'account-deletion',
      returnTo: '/account',
      expectedUserId: 'user-1',
    })

    renderCallback('user-1')

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/account'))
    expect(consumeDeletionReauthReceipt('user-1')).toBe(true)
  })

  it('drops a deletion reauth when a different account comes back', async () => {
    rememberOAuthAttempt('github', {
      purpose: 'account-deletion',
      returnTo: '/account',
      expectedUserId: 'user-1',
    })

    renderCallback('user-2')

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/'))
    expect(consumeDeletionReauthReceipt('user-1')).toBe(false)
    expect(consumeDeletionReauthReceipt('user-2')).toBe(false)
  })
})
