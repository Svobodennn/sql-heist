import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { AuthContext, type AuthContextValue } from '@/features/auth/AuthProvider'
import { SignUpForm } from '@/features/auth/SignUpForm'
import { I18nContext } from '@/i18n/I18nProvider'
import type { Locale } from '@/i18n/config'
import { createTranslator } from '@/i18n/translate'
import en from '@/messages/en.json'
import tr from '@/messages/tr.json'
import { EMAIL_MAX_LENGTH, USERNAME_MAX_LENGTH } from '@/features/auth/validation'

vi.hoisted(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
})

// Signup deliberately does not probe private username reservations while anon;
// availability is checked after confirmation in UsernameGate.
vi.mock('@/features/auth/authClient', () => ({
  resendSignupEmail: vi.fn(async () => ({})),
  rememberPendingEmail: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function makeValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: null as User | null,
    profile: null,
    profileReady: false,
    status: 'anon',
    signInEmail: vi.fn(async () => ({})),
    signUpEmail: vi.fn(async () => ({})),
    signOut: vi.fn(async () => {}),
    refreshProfile: vi.fn(async () => {}),
    adoptProfile: vi.fn(),
    ...overrides,
  }
}

function renderForm(value: AuthContextValue, locale: Locale = 'en') {
  const primary = locale === 'tr' ? tr : en
  return render(
    <I18nContext.Provider value={{ locale, setLocale: vi.fn(), t: createTranslator(primary, en) }}>
      <AuthContext.Provider value={value}>
        <SignUpForm />
      </AuthContext.Provider>
    </I18nContext.Provider>,
  )
}

describe('<SignUpForm>', () => {
  it('renders the disabled notice with no form when auth is off', () => {
    render(<SignUpForm />) // no provider → disabled default
    expect(screen.getByText(/accounts are unavailable right now/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Create account' })).toBeNull()
  })

  it('offers Google and GitHub account creation alongside the email form', () => {
    renderForm(makeValue())

    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Continue with GitHub' })).toBeTruthy()
    expect(screen.getByText('or use email')).toBeTruthy()
  })

  it('client-validates before calling signUpEmail', () => {
    const value = makeValue()
    renderForm(value)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'bad' } })
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'x' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(value.signUpEmail).not.toHaveBeenCalled()
    expect(screen.getByText('Enter a valid email address.')).toBeTruthy()
  })

  it('caps email and username inputs at their validated boundaries', () => {
    renderForm(makeValue())
    expect(screen.getByLabelText('Email').getAttribute('maxlength')).toBe(String(EMAIL_MAX_LENGTH))
    expect(screen.getByLabelText('Username').getAttribute('maxlength')).toBe(
      String(USERNAME_MAX_LENGTH),
    )
  })

  it('shows the purpose notice without naming an individual and links to the legal pages', () => {
    renderForm(makeValue())
    expect(
      screen.getByText(/we process your email, username, account progress.*google or github/i),
    ).toBeTruthy()
    expect(document.body.textContent).not.toContain('Melih Saraç')
    expect(
      screen
        .getAllByRole('link', { name: 'Privacy notice' })
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/privacy', '/privacy'])
    expect(
      screen
        .getAllByRole('link', { name: 'Terms of Use' })
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/terms', '/terms'])
  })

  it('keeps signup, legal, and sign-in links inside the Turkish locale', () => {
    renderForm(makeValue(), 'tr')
    expect(
      screen.getByText(/e-posta adresini, kullanıcı adını, hesap ilerlemeni.*google veya github/i),
    ).toBeTruthy()
    expect(document.body.textContent).not.toContain('Melih Saraç')
    expect(
      screen
        .getAllByRole('link', { name: 'Gizlilik ve KVKK Aydınlatma Metni' })
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/tr/privacy', '/tr/privacy'])
    expect(
      screen
        .getAllByRole('link', { name: 'Kullanım Koşulları' })
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/tr/terms', '/tr/terms'])
    expect(screen.getByRole('link', { name: 'Giriş yap' }).getAttribute('href')).toBe(
      '/tr/auth/sign-in',
    )
  })

  it('swaps to the check-inbox card on success and remembers the address', async () => {
    const value = makeValue({ signUpEmail: vi.fn(async () => ({})) })
    renderForm(value)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } })
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'ada_l' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Hunter22!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    await waitFor(() => {
      expect(value.signUpEmail).toHaveBeenCalledWith('ada@example.com', 'Hunter22!', 'ada_l')
      expect(screen.getByText(/check your inbox/i)).toBeTruthy()
    })
  })

  it('shows the same check-inbox result when an existing account response reaches the form', async () => {
    const value = makeValue({ signUpEmail: vi.fn(async () => ({ error: 'user-exists' as const })) })
    renderForm(value)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } })
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'ada_l' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Hunter22!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    await waitFor(() => expect(screen.getByText(/check your inbox/i)).toBeTruthy())
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
