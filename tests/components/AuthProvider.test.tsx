import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth, type AuthContextValue } from '@/features/auth'

// Clear the Supabase env BEFORE the module graph loads — vi.hoisted runs ahead of
// the static imports above, so lib/supabase resolves the env-less branch and this
// suite exercises exactly the no-secrets (e2e/CI) build shape.
vi.hoisted(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
})

afterEach(cleanup)

function Probe() {
  const { status, user, profile } = useAuth()
  return (
    <span data-testid="status">
      {status}:{String(user)}:{String(profile)}
    </span>
  )
}

function CaptureValue({ onValue }: { onValue: (value: AuthContextValue) => void }) {
  onValue(useAuth())
  return null
}

describe('<AuthProvider> without Supabase env', () => {
  it("is cleanly 'disabled' and still renders children (anonymous path untouched)", () => {
    render(
      <AuthProvider>
        <Probe />
        <p>game</p>
      </AuthProvider>,
    )
    expect(screen.getByTestId('status').textContent).toBe('disabled:null:null')
    expect(screen.getByText('game')).toBeTruthy()
  })

  it("a consumer outside any provider sees the safe 'disabled' default", () => {
    render(<Probe />)
    expect(screen.getByTestId('status').textContent).toBe('disabled:null:null')
  })

  it('auth methods no-op with a typed error instead of throwing', async () => {
    let captured: AuthContextValue | undefined
    render(
      <AuthProvider>
        <CaptureValue onValue={(value) => (captured = value)} />
      </AuthProvider>,
    )
    expect(captured).toBeDefined()
    await expect(captured!.signInEmail('a@example.com', 'pw')).resolves.toEqual({
      error: 'auth-disabled',
    })
    await expect(captured!.signUpEmail('a@example.com', 'pw', 'agent_x')).resolves.toEqual({
      error: 'auth-disabled',
    })
    await expect(captured!.signOut()).resolves.toBeUndefined()
    await expect(captured!.refreshProfile()).resolves.toBeUndefined()
  })
})
