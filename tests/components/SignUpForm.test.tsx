import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { AuthContext, type AuthContextValue } from '@/features/auth/AuthProvider'
import { SignUpForm } from '@/features/auth/SignUpForm'

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

function renderForm(value: AuthContextValue) {
  return render(
    <AuthContext.Provider value={value}>
      <SignUpForm />
    </AuthContext.Provider>,
  )
}

describe('<SignUpForm>', () => {
  it('renders the disabled notice with no form when auth is off', () => {
    render(<SignUpForm />) // no provider → disabled default
    expect(screen.getByText(/accounts are unavailable right now/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Create account' })).toBeNull()
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

  it('swaps to the check-inbox card on success and remembers the address', async () => {
    const value = makeValue({ signUpEmail: vi.fn(async () => ({})) })
    renderForm(value)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } })
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'ada_l' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'hunter22' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    await waitFor(() => {
      expect(value.signUpEmail).toHaveBeenCalledWith('ada@example.com', 'hunter22', 'ada_l')
      expect(screen.getByText(/check your inbox/i)).toBeTruthy()
    })
  })

  it('surfaces a mapped signup error as an alert', async () => {
    const value = makeValue({ signUpEmail: vi.fn(async () => ({ error: 'user-exists' as const })) })
    renderForm(value)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } })
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'ada_l' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'hunter22' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('This email already has an account.'),
    )
  })
})
