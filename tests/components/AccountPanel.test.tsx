import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { AuthContext, type AuthContextValue, type Profile } from '@/features/auth/AuthProvider'
import { I18nContext } from '@/i18n/I18nProvider'
import type { Locale } from '@/i18n/config'
import { createTranslator } from '@/i18n/translate'
import en from '@/messages/en.json'
import tr from '@/messages/tr.json'

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
  DISPLAY_NAME_MAX_LENGTH: 40,
  deleteMyAccount: deleteMyAccountMock,
  exportMyData: exportMyDataMock,
  profileFieldsAreValid: (displayName: string) => displayName.trim().length <= 40,
  setLeaderboardOptIn: setLeaderboardOptInMock,
  updateMyProfile: updateMyProfileMock,
}))

import { AccountPanel } from '@/features/profile/AccountPanel'

const profile: Profile = {
  id: 'user-1',
  username: 'ada_l',
  displayName: 'Ada',
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

function renderPanel(value: AuthContextValue, locale: Locale = 'en') {
  const primary = locale === 'tr' ? tr : en
  return render(
    <I18nContext.Provider value={{ locale, setLocale: vi.fn(), t: createTranslator(primary, en) }}>
      <AuthContext.Provider value={value}>
        <AccountPanel />
      </AuthContext.Provider>
    </I18nContext.Provider>,
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

  it('redirects anonymous Turkish visitors to localized sign-in', async () => {
    renderPanel(makeValue({ status: 'anon', user: null, profile: null, profileReady: false }), 'tr')
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/tr/auth/sign-in'))
  })

  it('does not collect a country', () => {
    renderPanel(makeValue())

    expect(screen.queryByLabelText('Country')).toBeNull()
  })

  it('saves trimmed display fields and refreshes provider state', async () => {
    const value = makeValue()
    renderPanel(value)
    fireEvent.change(screen.getByLabelText('Display name'), {
      target: { value: '  Ada Lovelace  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))

    await waitFor(() => {
      expect(updateMyProfileMock).toHaveBeenCalledWith({
        displayName: '  Ada Lovelace  ',
      })
      expect(value.refreshProfile).toHaveBeenCalled()
    })
  })

  it('shows an unlabeled skeleton instead of themed loading copy while auth settles', () => {
    renderPanel(makeValue({ profile: null, profileReady: false }))

    const loading = screen.getByRole('status', { name: 'Loading account…' })
    expect(loading.getAttribute('aria-busy')).toBe('true')
    expect(screen.queryByText('Opening your file…')).toBeNull()
  })

  it('persists explicit public-profile consent', async () => {
    const value = makeValue()
    renderPanel(value)
    expect(screen.getByRole('link', { name: 'Privacy notice' }).getAttribute('href')).toBe(
      '/privacy',
    )
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

  it('keeps public profile and post-deletion navigation inside the active locale', async () => {
    const value = makeValue({ profile: { ...profile, leaderboardOptIn: true } })
    renderPanel(value, 'tr')

    expect(
      screen.getByRole('link', { name: 'Herkese açık profili gör' }).getAttribute('href'),
    ).toBe('/tr/u?name=ada_l')
    expect(screen.getByRole('link', { name: 'Gizlilik bildirimi' }).getAttribute('href')).toBe(
      '/tr/privacy',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Hesap silme talebi oluştur' }))
    fireEvent.change(screen.getByLabelText('Onaylamak için ada_l yaz'), {
      target: { value: 'ada_l' },
    })
    fireEvent.change(screen.getByLabelText('Mevcut şifre'), {
      target: { value: 'correct horse' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Silme talebini gönder' }))

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/tr'))
  })
})
