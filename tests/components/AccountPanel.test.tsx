import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { AuthContext, type AuthContextValue, type Profile } from '@/features/auth/AuthProvider'

const {
  deleteMyAccountMock,
  exportMyDataMock,
  replaceMock,
  setLeaderboardOptInMock,
  updateMyProfileMock,
} = vi.hoisted(() => ({
  deleteMyAccountMock: vi.fn(),
  exportMyDataMock: vi.fn(),
  replaceMock: vi.fn(),
  setLeaderboardOptInMock: vi.fn(),
  updateMyProfileMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock, prefetch: vi.fn() }),
}))

vi.mock('@/features/profile/lib/profileQuery', () => ({
  COUNTRY_MAX_LENGTH: 56,
  DISPLAY_NAME_MAX_LENGTH: 80,
  deleteMyAccount: deleteMyAccountMock,
  exportMyData: exportMyDataMock,
  setLeaderboardOptIn: setLeaderboardOptInMock,
  updateMyProfile: updateMyProfileMock,
}))

import { AccountPanel } from '@/features/profile/AccountPanel'

const profile: Profile = {
  id: 'user-1',
  username: 'ada_l',
  displayName: 'Ada',
  country: 'GB',
  leaderboardOptIn: false,
  createdAt: '2026-08-22T00:00:00.000Z',
  updatedAt: '2026-08-22T00:00:00.000Z',
}

const user = { id: profile.id, email: 'ada@example.com' } as User

function makeValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user,
    profile,
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

function renderPanel(value: AuthContextValue) {
  return render(
    <AuthContext.Provider value={value}>
      <AccountPanel />
    </AuthContext.Provider>,
  )
}

afterEach(cleanup)

beforeEach(() => {
  vi.clearAllMocks()
  updateMyProfileMock.mockResolvedValue({})
  setLeaderboardOptInMock.mockResolvedValue({})
  exportMyDataMock.mockResolvedValue(new Blob(['{}'], { type: 'application/json' }))
  deleteMyAccountMock.mockResolvedValue(undefined)
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:account-export'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})

describe('<AccountPanel>', () => {
  it('redirects anonymous visitors to canonical sign-in', async () => {
    renderPanel(makeValue({ status: 'anon', user: null, profile: null, profileReady: false }))
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/auth/sign-in'))
  })

  it('saves trimmed display fields and refreshes provider state', async () => {
    const value = makeValue()
    renderPanel(value)
    fireEvent.change(screen.getByLabelText('Display name'), {
      target: { value: '  Ada Lovelace  ' },
    })
    fireEvent.change(screen.getByLabelText('Country'), { target: { value: '  UK  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))

    await waitFor(() => {
      expect(updateMyProfileMock).toHaveBeenCalledWith({
        displayName: '  Ada Lovelace  ',
        country: '  UK  ',
      })
      expect(value.refreshProfile).toHaveBeenCalled()
    })
  })

  it('persists explicit public-profile consent', async () => {
    const value = makeValue()
    renderPanel(value)
    fireEvent.click(screen.getByLabelText('Show my profile publicly'))

    await waitFor(() => {
      expect(setLeaderboardOptInMock).toHaveBeenCalledWith(true)
      expect(value.refreshProfile).toHaveBeenCalled()
    })
  })

  it('downloads the caller data export', async () => {
    renderPanel(makeValue())
    fireEvent.click(screen.getByRole('button', { name: 'Download my data' }))

    await waitFor(() => expect(exportMyDataMock).toHaveBeenCalled())
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled()
  })

  it('requires the exact username before submitting a deletion request', async () => {
    const value = makeValue()
    renderPanel(value)
    fireEvent.click(screen.getByRole('button', { name: 'Request account deletion' }))

    const submit = screen.getByRole('button', { name: 'Submit deletion request' })
    expect((submit as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Type ada_l to confirm'), {
      target: { value: 'ada_l' },
    })
    const password = screen.getByLabelText('Current password')
    expect(password.hasAttribute('required')).toBe(true)
    fireEvent.change(password, {
      target: { value: 'correct horse' },
    })
    fireEvent.click(submit)

    await waitFor(() => {
      expect(deleteMyAccountMock).toHaveBeenCalledWith('correct horse')
      expect(value.signOut).toHaveBeenCalled()
      expect(replaceMock).toHaveBeenCalledWith('/')
    })
  })

  it('shows a specific alert when password re-authentication fails', async () => {
    deleteMyAccountMock.mockRejectedValueOnce({ code: 'reauth-failed' })
    renderPanel(makeValue())
    fireEvent.click(screen.getByRole('button', { name: 'Request account deletion' }))
    fireEvent.change(screen.getByLabelText('Type ada_l to confirm'), {
      target: { value: 'ada_l' },
    })
    fireEvent.change(screen.getByLabelText('Current password'), {
      target: { value: 'wrong' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit deletion request' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('That password did not match. Try again.')
    const password = screen.getByLabelText('Current password')
    expect(password.getAttribute('aria-invalid')).toBe('true')
    expect(password.getAttribute('aria-describedby')).toBe(alert.id)
  })

  it('serializes profile and visibility mutations', async () => {
    let releaseUpdate: (() => void) | undefined
    updateMyProfileMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseUpdate = resolve
        }),
    )
    renderPanel(makeValue())
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))

    await waitFor(() => expect(updateMyProfileMock).toHaveBeenCalled())
    const visibility = screen.getByLabelText('Show my profile publicly') as HTMLInputElement
    expect(visibility.disabled).toBe(true)
    fireEvent.click(visibility)
    expect(setLeaderboardOptInMock).not.toHaveBeenCalled()

    releaseUpdate?.()
    await waitFor(() => expect(screen.getByText('Profile saved.')).toBeTruthy())
  })
})
