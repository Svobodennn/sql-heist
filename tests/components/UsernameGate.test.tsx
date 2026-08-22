import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
    country: null,
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
  it('opens only for an authed user whose profile lookup settled on "no row"', () => {
    renderGate(makeValue())
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('stays hidden while the profile is unresolved, present, or the user is anon', () => {
    renderGate(makeValue({ profileReady: false }))
    expect(screen.queryByRole('dialog')).toBeNull()
    cleanup()

    renderGate(makeValue({ profile: { ...mkRow(), username: 'neo_01' } as never }))
    expect(screen.queryByRole('dialog')).toBeNull()
    cleanup()

    renderGate(makeValue({ status: 'anon', user: null }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('seeds the input from signup metadata, normalized to the DB format', () => {
    renderGate(makeValue())
    expect((screen.getByLabelText('Username') as HTMLInputElement).value).toBe('neo_01')
  })

  it('adopts the created row directly (no re-read), which closes the gate', async () => {
    const value = makeValue()
    renderGate(value)
    fireEvent.click(screen.getByRole('button', { name: 'Claim it' }))
    await waitFor(() => {
      expect(createMyProfile).toHaveBeenCalledWith('user-1', 'neo_01')
      expect(value.adoptProfile).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-1' }))
    })
    expect(value.refreshProfile).not.toHaveBeenCalled()
  })

  it('shows the taken message when the unique constraint wins the race', async () => {
    vi.mocked(createMyProfile).mockResolvedValueOnce({ error: 'username-taken' })
    const value = makeValue()
    renderGate(value)
    fireEvent.click(screen.getByRole('button', { name: 'Claim it' }))
    await waitFor(() => {
      expect(screen.getByText('Taken — try another.')).toBeTruthy()
    })
    expect(value.adoptProfile).not.toHaveBeenCalled()
  })
})
