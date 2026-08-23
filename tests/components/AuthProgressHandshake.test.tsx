import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'

const mocks = vi.hoisted(() => ({
  getSupabase: vi.fn(),
  authCallback: undefined as undefined | ((event: string, session: { user: User } | null) => void),
  readCaseProgress: vi.fn(),
  mergeLocalIntoServer: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  getSupabase: mocks.getSupabase,
  isSupabaseConfigured: () => true,
}))

vi.mock('@/features/game/lib/useCaseProgress', () => ({
  readCaseProgress: mocks.readCaseProgress,
}))

vi.mock('@/features/game/lib/progressSync', () => ({
  mergeLocalIntoServer: mocks.mergeLocalIntoServer,
}))

import { AuthProvider } from '@/features/auth/AuthProvider'

const profileRow = {
  id: 'user-1',
  username: 'neo_01',
  display_name: null,
  country: null,
  leaderboard_opt_in: false,
  created_at: '2026-08-23T00:00:00Z',
  updated_at: '2026-08-23T00:00:00Z',
}

beforeEach(() => {
  mocks.authCallback = undefined
  mocks.getSupabase.mockReset()
  mocks.readCaseProgress.mockReset()
  mocks.mergeLocalIntoServer.mockReset()

  const maybeSingle = vi.fn(async () => ({ data: profileRow, error: null }))
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  const onAuthStateChange = vi.fn(
    (callback: (event: string, session: { user: User } | null) => void) => {
      mocks.authCallback = callback
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    },
  )

  mocks.getSupabase.mockReturnValue({ auth: { onAuthStateChange }, from })
  mocks.readCaseProgress.mockReturnValue({
    'the-front-door': { objectives: ['bypass-login'] },
  })
  mocks.mergeLocalIntoServer.mockResolvedValue({})
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
    act(() => mocks.authCallback?.('SIGNED_IN', { user }))

    await waitFor(() => expect(mocks.mergeLocalIntoServer).toHaveBeenCalledTimes(1))
    expect(mocks.mergeLocalIntoServer).toHaveBeenCalledWith({
      'the-front-door': { objectives: ['bypass-login'] },
    })

    act(() => mocks.authCallback?.('TOKEN_REFRESHED', { user }))
    await Promise.resolve()
    expect(mocks.mergeLocalIntoServer).toHaveBeenCalledTimes(1)

    act(() => mocks.authCallback?.('SIGNED_OUT', null))
    act(() => mocks.authCallback?.('SIGNED_IN', { user }))
    await waitFor(() => expect(mocks.mergeLocalIntoServer).toHaveBeenCalledTimes(2))
  })
})
