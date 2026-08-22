import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { AuthContext, type AuthContextValue } from '@/features/auth/AuthProvider'
import { SignInForm } from '@/features/auth/SignInForm'

// No Supabase env in the test process → module-level guard resolves 'disabled';
// the anon/authed flows below are driven through a mocked context instead.
vi.hoisted(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
})

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn() }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function makeAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
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

function renderWithAuth(value: AuthContextValue) {
  return render(
    <AuthContext.Provider value={value}>
      <SignInForm />
    </AuthContext.Provider>,
  )
}

describe('<SignInForm>', () => {
  it('outside any provider (env-less build) it renders the disabled notice, no form', () => {
    render(<SignInForm />)
    expect(screen.getByText(/accounts are unavailable right now/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull()
  })

  it('blocks an invalid email client-side and never calls signInEmail', () => {
    const value = makeAuthValue()
    renderWithAuth(value)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'nope' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'hunter22' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(screen.getByText('Enter a valid email address.')).toBeTruthy()
    expect(value.signInEmail).not.toHaveBeenCalled()
  })

  it('surfaces a mapped auth error as an alert', async () => {
    const value = makeAuthValue({
      signInEmail: vi.fn(async () => ({ error: 'invalid-credentials' as const })),
    })
    renderWithAuth(value)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'hunter22' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Wrong email or password.')
    })
    expect(value.signInEmail).toHaveBeenCalledWith('ada@example.com', 'hunter22')
  })

  it('on success it navigates home', async () => {
    const value = makeAuthValue()
    renderWithAuth(value)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'hunter22' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/'))
  })
})
