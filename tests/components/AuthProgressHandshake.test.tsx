import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session, User } from '@supabase/supabase-js'

const mocks = vi.hoisted(() => ({
  getSupabase: vi.fn(),
  authCallback: undefined as undefined | ((event: string, session: Session | null) => void),
  claimAnonymousCaseProgress: vi.fn(),
  cacheAccountCaseProgress: vi.fn(),
  mergeAndCacheAccountCaseProgress: vi.fn(),
  mergeLocalIntoServer: vi.fn(),
  peekOAuthProvider: vi.fn(),
  revokeUnusedProviderCredential: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  getSupabase: mocks.getSupabase,
  isSupabaseConfigured: () => true,
}))

vi.mock('@/features/game/lib/useCaseProgress', () => ({
  claimAnonymousCaseProgress: mocks.claimAnonymousCaseProgress,
  cacheAccountCaseProgress: mocks.cacheAccountCaseProgress,
  mergeAndCacheAccountCaseProgress: mocks.mergeAndCacheAccountCaseProgress,
}))

vi.mock('@/features/game/lib/progressSync', () => ({
  mergeLocalIntoServer: mocks.mergeLocalIntoServer,
}))

vi.mock('@/features/auth/oauthFlow', () => ({
  peekOAuthProvider: mocks.peekOAuthProvider,
}))

vi.mock('@/features/auth/providerCredentialCleanup', () => ({
  revokeUnusedProviderCredential: mocks.revokeUnusedProviderCredential,
}))

import { AuthProvider } from '@/features/auth/AuthProvider'

const profileRow = {
  id: 'user-1',
  username: 'neo_01',
  display_name: null,
  leaderboard_opt_in: false,
  created_at: '2026-08-23T00:00:00Z',
  updated_at: '2026-08-23T00:00:00Z',
}

beforeEach(() => {
  mocks.authCallback = undefined
  mocks.getSupabase.mockReset()
  mocks.claimAnonymousCaseProgress.mockReset()
  mocks.cacheAccountCaseProgress.mockReset()
  mocks.mergeAndCacheAccountCaseProgress.mockReset()
  mocks.mergeLocalIntoServer.mockReset()
  mocks.peekOAuthProvider.mockReset()
  mocks.revokeUnusedProviderCredential.mockReset()

  const maybeSingle = vi.fn(async () => ({ data: profileRow, error: null }))
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  const onAuthStateChange = vi.fn((callback: (event: string, session: Session | null) => void) => {
    mocks.authCallback = callback
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  })

  mocks.getSupabase.mockReturnValue({ auth: { onAuthStateChange }, from })
  mocks.claimAnonymousCaseProgress.mockReturnValue({
    'the-front-door': { objectives: ['bypass-login'] },
  })
  mocks.mergeLocalIntoServer.mockResolvedValue({})
  mocks.cacheAccountCaseProgress.mockReturnValue(true)
  mocks.mergeAndCacheAccountCaseProgress.mockReturnValue({})
  mocks.peekOAuthProvider.mockReturnValue(null)
})

afterEach(cleanup)

describe('<AuthProvider> progress handshake', () => {
  it('merges once after the profile exists and resets after sign-out', async () => {
    const user = { id: 'user-1' } as User
    render(
      <AuthProvider>
        <span>game</span>
      </AuthProvider>,
    )

    expect(mocks.authCallback).toBeDefined()
    act(() => mocks.authCallback?.('SIGNED_IN', { user } as Session))

    await waitFor(() => expect(mocks.mergeLocalIntoServer).toHaveBeenCalledTimes(1))
    expect(mocks.mergeLocalIntoServer).toHaveBeenCalledWith({
      'the-front-door': { objectives: ['bypass-login'] },
    })
    expect(mocks.claimAnonymousCaseProgress).toHaveBeenCalledWith('user-1')
    expect(mocks.mergeAndCacheAccountCaseProgress).toHaveBeenCalledWith('user-1', {})
    expect(mocks.cacheAccountCaseProgress).not.toHaveBeenCalled()

    act(() => mocks.authCallback?.('TOKEN_REFRESHED', { user } as Session))
    await Promise.resolve()
    expect(mocks.mergeLocalIntoServer).toHaveBeenCalledTimes(1)

    act(() => mocks.authCallback?.('SIGNED_OUT', null))
    act(() => mocks.authCallback?.('SIGNED_IN', { user } as Session))
    await waitFor(() => expect(mocks.mergeLocalIntoServer).toHaveBeenCalledTimes(2))
  })

  it('hands a transient Google credential to the cleanup boundary without awaiting it', async () => {
    const user = { id: 'user-1' } as User
    const session = { user, provider_token: 'transient-google-token' } as Session
    mocks.peekOAuthProvider.mockReturnValue('google')

    render(
      <AuthProvider>
        <span>game</span>
      </AuthProvider>,
    )

    act(() => mocks.authCallback?.('SIGNED_IN', session))

    await waitFor(() =>
      expect(mocks.revokeUnusedProviderCredential).toHaveBeenCalledWith('google', session),
    )
    await waitFor(() => expect(mocks.mergeLocalIntoServer).toHaveBeenCalledTimes(1))
  })

  it('does not cache a completed handshake after the user signs out', async () => {
    const user = { id: 'user-1' } as User
    let resolveMerge!: (value: Record<string, { objectives: string[] }>) => void
    mocks.mergeLocalIntoServer.mockReturnValue(
      new Promise((resolve) => {
        resolveMerge = resolve
      }),
    )

    render(
      <AuthProvider>
        <span>game</span>
      </AuthProvider>,
    )

    act(() => mocks.authCallback?.('SIGNED_IN', { user } as Session))
    await waitFor(() => expect(mocks.mergeLocalIntoServer).toHaveBeenCalledTimes(1))
    act(() => mocks.authCallback?.('SIGNED_OUT', null))
    await act(async () => {
      resolveMerge({ 'the-vault': { objectives: ['extract-ledger'] } })
      await Promise.resolve()
    })

    expect(mocks.mergeAndCacheAccountCaseProgress).not.toHaveBeenCalled()
  })
})
