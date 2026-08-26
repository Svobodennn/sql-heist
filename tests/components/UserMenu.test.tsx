import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { AuthContext, type AuthContextValue } from '@/features/auth/AuthProvider'
import { UserMenu } from '@/features/auth/UserMenu'
import { I18nContext } from '@/i18n/I18nProvider'
import en from '@/messages/en.json'
import tr from '@/messages/tr.json'
import { createTranslator } from '@/i18n/translate'

const value: AuthContextValue = {
  user: { id: 'user-1', email: 'ada@example.com' } as User,
  profile: {
    id: 'user-1',
    username: 'ada_l',
    displayName: 'Ada',
    leaderboardOptIn: false,
    createdAt: '2026-08-22T00:00:00.000Z',
    updatedAt: '2026-08-22T00:00:00.000Z',
  },
  profileReady: true,
  status: 'authed',
  signInEmail: vi.fn(async () => ({})),
  signUpEmail: vi.fn(async () => ({})),
  signOut: vi.fn(async () => {}),
  refreshProfile: vi.fn(async () => {}),
  adoptProfile: vi.fn(),
}

afterEach(cleanup)

describe('<UserMenu>', () => {
  it('returns focus to its trigger when Escape closes the disclosure', () => {
    render(
      <AuthContext.Provider value={value}>
        <UserMenu />
      </AuthContext.Provider>,
    )

    const trigger = screen.getByRole('button', { name: 'Account menu: ada_l' })
    fireEvent.click(trigger)
    const accountLink = screen.getByRole('link', { name: 'Account' })
    const leaderboardLink = screen.getByRole('link', { name: 'Leaderboard' })
    expect(leaderboardLink.getAttribute('href')).toBe('/leaderboard')
    accountLink.focus()
    expect(document.activeElement).toBe(accountLink)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('link', { name: 'Account' })).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('keeps account destinations inside the active locale', () => {
    render(
      <I18nContext.Provider
        value={{ locale: 'tr', setLocale: vi.fn(), t: createTranslator(tr, en) }}
      >
        <AuthContext.Provider value={value}>
          <UserMenu />
        </AuthContext.Provider>
      </I18nContext.Provider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Hesap menüsü: ada_l' }))
    expect(screen.getByRole('link', { name: 'Hesap' }).getAttribute('href')).toBe('/tr/account')
    expect(screen.getByRole('link', { name: 'Sıralama' }).getAttribute('href')).toBe(
      '/tr/leaderboard',
    )
  })
})
