import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { AuthContext, type AuthContextValue } from '@/features/auth/AuthProvider'

const { getLeaderboardMock, getMyRankMock } = vi.hoisted(() => ({
  getLeaderboardMock: vi.fn(),
  getMyRankMock: vi.fn(),
}))

vi.mock('@/features/leaderboard/lib/leaderboardQuery', () => ({
  getLeaderboard: getLeaderboardMock,
  getMyRank: getMyRankMock,
}))

import { LeaderboardTable } from '@/features/leaderboard/LeaderboardTable'

const baseAuth: AuthContextValue = {
  user: null,
  profile: null,
  profileReady: true,
  status: 'anon',
  signInEmail: vi.fn(async () => ({})),
  signUpEmail: vi.fn(async () => ({})),
  signOut: vi.fn(async () => {}),
  refreshProfile: vi.fn(async () => {}),
  adoptProfile: vi.fn(),
}

function renderLeaderboard(auth: AuthContextValue = baseAuth) {
  return render(
    <AuthContext.Provider value={auth}>
      <LeaderboardTable />
    </AuthContext.Provider>,
  )
}

afterEach(cleanup)

beforeEach(() => {
  getLeaderboardMock.mockReset()
  getMyRankMock.mockReset()
})

describe('<LeaderboardTable>', () => {
  it('renders the casual disclosure and safe public rows with profile links', async () => {
    getLeaderboardMock.mockResolvedValue([
      {
        rank: 1,
        username: 'ada_l',
        displayName: 'Ada',
        country: 'GB',
        objectivesCleared: 7,
        lastActive: '2026-08-22T10:00:00.000Z',
      },
      {
        rank: 2,
        username: 'grace_h',
        displayName: null,
        country: null,
        objectivesCleared: 5,
        lastActive: null,
      },
    ])

    renderLeaderboard()

    expect(screen.getByText('Opening the ledger…')).toBeTruthy()
    await screen.findByRole('link', { name: /Ada.*@ada_l/ })
    expect(screen.getByText('Casual board')).toBeTruthy()
    expect(screen.getByText(/submitted by players' browsers/i)).toBeTruthy()
    const tableRegion = screen.getByRole('region', { name: 'Leaderboard results' })
    expect(tableRegion.getAttribute('tabindex')).toBe('0')
    expect(screen.getByText('Scroll horizontally to see every column.')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Ada.*@ada_l/ }).getAttribute('href')).toBe(
      '/u?name=ada_l',
    )
    expect(screen.getByRole('link', { name: /grace_h.*@grace_h/ }).getAttribute('href')).toBe(
      '/u?name=grace_h',
    )
    expect(screen.getByText('No synced activity')).toBeTruthy()
    expect(getMyRankMock).not.toHaveBeenCalled()
  })

  it('renders a quiet empty state', async () => {
    getLeaderboardMock.mockResolvedValue([])
    renderLeaderboard()

    await screen.findByText('No operatives on the board')
    expect(screen.getByRole('link', { name: 'Browse cases' }).getAttribute('href')).toBe('/cases')
  })

  it('hides database details behind a generic unavailable state', async () => {
    getLeaderboardMock.mockRejectedValue(new Error('relation public.leaderboard missing'))
    renderLeaderboard()

    await screen.findByText("Couldn't open the leaderboard")
    expect(document.body.textContent).not.toContain('relation public.leaderboard missing')
  })

  it('shows the authenticated caller rank from the private RPC', async () => {
    getLeaderboardMock.mockResolvedValue([])
    getMyRankMock.mockResolvedValue({ rank: 9, objectivesCleared: 1 })
    renderLeaderboard({
      ...baseAuth,
      user: { id: 'user-1', email: 'ada@example.com' } as User,
      status: 'authed',
    })

    await screen.findByText('#9')
    expect(screen.getByText('Objectives cleared: 1')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('#9')
    expect(getMyRankMock).toHaveBeenCalledTimes(1)
  })

  it('announces a private rank request failure without exposing its detail', async () => {
    getLeaderboardMock.mockResolvedValue([])
    getMyRankMock.mockRejectedValue(new Error('private RPC detail'))
    renderLeaderboard({
      ...baseAuth,
      user: { id: 'user-1', email: 'ada@example.com' } as User,
      status: 'authed',
    })

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Your rank is unavailable right now.')
    expect(alert.textContent).not.toContain('private RPC detail')
  })

  it('offers the visibility setting when the authenticated caller is not ranked', async () => {
    getLeaderboardMock.mockResolvedValue([])
    getMyRankMock.mockResolvedValue(null)
    renderLeaderboard({
      ...baseAuth,
      user: { id: 'user-1', email: 'ada@example.com' } as User,
      status: 'authed',
    })

    await waitFor(() => expect(screen.getByText('You are not on the board.')).toBeTruthy())
    expect(screen.getByRole('link', { name: 'Manage visibility' }).getAttribute('href')).toBe(
      '/account',
    )
  })
})
