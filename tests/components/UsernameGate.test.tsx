import { StrictMode } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { AuthContext, type AuthContextValue } from '@/features/auth/AuthProvider'
import type { ProfileRow } from '@/features/auth/authClient'
import { UsernameGate } from '@/features/auth/UsernameGate'

vi.hoisted(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
})

// The gate + its availability hook talk to authClient directly — mock it.
vi.mock('@/features/auth/authClient', () => ({
  createMyProfile: vi.fn(async () => ({ row: mkRow() })),
  usernameAvailable: vi.fn(async () => true),
}))

import { createMyProfile } from '@/features/auth/authClient'

function mkRow(): ProfileRow {
  return {
    id: 'user-1',
    username: 'neo_01',
    display_name: null,
    leaderboard_opt_in: false,
    created_at: '2026-08-22T00:00:00Z',
    updated_at: '2026-08-22T00:00:00Z',
  }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const authedUser = { id: 'user-1', user_metadata: { username: 'Neo_01' } } as unknown as User
const userWithoutSignupUsername = { id: 'user-1', user_metadata: {} } as unknown as User
const githubUser = {
  id: 'user-1',
  app_metadata: { provider: 'github', providers: ['github'] },
  user_metadata: { user_name: 'Café-Noir' },
} as unknown as User

function makeValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: authedUser,
    profile: null,
    profileReady: true,
    status: 'authed',
    signInEmail: vi.fn(async () => ({})),
    signUpEmail: vi.fn(async () => ({})),
    signOut: vi.fn(async () => {}),
    refreshProfile: vi.fn(async () => {}),
    adoptProfile: vi.fn(),
    ...overrides,
  }
}

function renderGate(value: AuthContextValue) {
  return render(
    <AuthContext.Provider value={value}>
      <UsernameGate />
    </AuthContext.Provider>,
  )
}

describe('<UsernameGate>', () => {
  it('automatically claims a valid signup username without opening the fallback dialog', async () => {
    const value = makeValue()
    renderGate(value)

    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => {
      expect(createMyProfile).toHaveBeenCalledWith('user-1', 'neo_01')
      expect(value.adoptProfile).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-1' }))
    })
  })

  it('opens the fallback dialog when signup metadata has no usable username', async () => {
    renderGate(makeValue({ user: userWithoutSignupUsername }))

    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(createMyProfile).not.toHaveBeenCalled()
  })

  it('prefills but never automatically claims an OAuth provider suggestion', async () => {
    renderGate(makeValue({ user: githubUser }))

    expect(((await screen.findByLabelText('Username')) as HTMLInputElement).value).toBe('cafe_noir')
    expect(createMyProfile).not.toHaveBeenCalled()
  })

  it('keeps one pending automatic claim alive through Strict Mode effect replay', async () => {
    let resolveClaim: ((value: { row: ProfileRow }) => void) | undefined
    vi.mocked(createMyProfile).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveClaim = resolve
      }),
    )
    const value = makeValue()

    render(
      <StrictMode>
        <AuthContext.Provider value={value}>
          <UsernameGate />
        </AuthContext.Provider>
      </StrictMode>,
    )

    await waitFor(() => expect(createMyProfile).toHaveBeenCalledTimes(1))
    resolveClaim?.({ row: mkRow() })
    await waitFor(() => expect(value.adoptProfile).toHaveBeenCalledWith(mkRow()))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('re-subscribes to the pending claim when auth refreshes the same user object', async () => {
    let resolveClaim: ((value: { row: ProfileRow }) => void) | undefined
    vi.mocked(createMyProfile).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveClaim = resolve
      }),
    )
    const adoptProfile = vi.fn()
    const firstValue = makeValue({ adoptProfile })
    const view = renderGate(firstValue)
    await waitFor(() => expect(createMyProfile).toHaveBeenCalledTimes(1))

    const refreshedUser = { ...authedUser, user_metadata: { username: 'Neo_01' } } as User
    view.rerender(
      <AuthContext.Provider value={makeValue({ user: refreshedUser, adoptProfile })}>
        <UsernameGate />
      </AuthContext.Provider>,
    )

    resolveClaim?.({ row: mkRow() })
    await waitFor(() => expect(adoptProfile).toHaveBeenCalledWith(mkRow()))
    expect(createMyProfile).toHaveBeenCalledTimes(1)
  })

  it('stays hidden while the profile is unresolved, present, or the user is anon', async () => {
    renderGate(makeValue({ profileReady: false }))
    expect(screen.queryByRole('dialog')).toBeNull()
    cleanup()

    renderGate(makeValue({ profile: { ...mkRow(), username: 'neo_01' } as never }))
    expect(screen.queryByRole('dialog')).toBeNull()
    cleanup()

    renderGate(makeValue({ status: 'anon', user: null }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('falls back to a prefilled dialog when the signup username was taken meanwhile', async () => {
    vi.mocked(createMyProfile).mockResolvedValueOnce({ error: 'username-taken' })
    renderGate(makeValue())

    expect(((await screen.findByLabelText('Username')) as HTMLInputElement).value).toBe('neo_01')
    expect(screen.getByText('Taken — try another.')).toBeTruthy()
  })
})
