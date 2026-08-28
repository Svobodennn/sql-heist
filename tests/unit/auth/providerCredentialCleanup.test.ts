// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import { revokeUnusedProviderCredential } from '@/features/auth/providerCredentialCleanup'

interface SubmittedRevocation {
  action: string
  method: string
  target: string
  token: string | null
}

function session(credentials: Partial<Session>): Session {
  return credentials as Session
}

describe('provider credential cleanup', () => {
  let submitted: SubmittedRevocation[]
  let submit: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    submitted = []
    vi.useFakeTimers()
    submit = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(function (
      this: HTMLFormElement,
    ) {
      const form = this
      submitted.push({
        action: form.action,
        method: form.method,
        target: form.target,
        token: form.querySelector<HTMLInputElement>('input[name="token"]')?.value ?? null,
      })
    })
  })

  afterEach(() => {
    submit.mockRestore()
    vi.useRealTimers()
    document.body.replaceChildren()
  })

  it('submits the transient Google refresh token to the revoke endpoint and removes token DOM', () => {
    expect(
      revokeUnusedProviderCredential(
        'google',
        session({
          provider_token: 'google-access',
          provider_refresh_token: 'google-refresh',
        }),
      ),
    ).toBe(true)

    expect(submitted).toEqual([
      {
        action: 'https://oauth2.googleapis.com/revoke',
        method: 'post',
        target: expect.stringMatching(/^sql-heist-google-revoke-/),
        token: 'google-refresh',
      },
    ])
    expect(document.querySelector('form')).toBeNull()
    expect(document.querySelector('iframe')).not.toBeNull()

    vi.runAllTimers()
    expect(document.querySelector('iframe')).toBeNull()
  })

  it('falls back to the transient Google access token when no refresh token is returned', () => {
    expect(
      revokeUnusedProviderCredential('google', session({ provider_token: 'google-access' })),
    ).toBe(true)

    expect(submitted[0]?.token).toBe('google-access')
  })

  it('does not submit provider credentials for GitHub or empty Google sessions', () => {
    expect(
      revokeUnusedProviderCredential('github', session({ provider_token: 'github-access' })),
    ).toBe(false)
    expect(revokeUnusedProviderCredential('google', session({}))).toBe(false)
    expect(submitted).toEqual([])
    expect(document.body.childElementCount).toBe(0)
  })
})
