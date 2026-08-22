import { describe, expect, it } from 'vitest'
import { mapAuthError } from '@/features/auth/authClient'

// GoTrue only returns English strings; this pins the best-effort mapping so a
// wording drift downgrades to 'generic' (safe floor) instead of a wrong bucket.
describe('mapAuthError', () => {
  it('maps the known GoTrue messages to their codes', () => {
    expect(mapAuthError('Invalid login credentials')).toBe('invalid-credentials')
    expect(mapAuthError('Email not confirmed')).toBe('email-not-confirmed')
    expect(mapAuthError('User already registered')).toBe('user-exists')
    expect(mapAuthError('A user with this email address has already been registered')).toBe(
      'user-exists',
    )
    expect(mapAuthError('Password should be at least 8 characters.')).toBe('weak-password')
  })

  it('flags rate limiting via status 429 or message', () => {
    expect(mapAuthError('anything', 429)).toBe('rate-limited')
    expect(mapAuthError('Email rate limit exceeded')).toBe('rate-limited')
  })

  it('falls back to generic for anything unknown', () => {
    expect(mapAuthError('Some brand new failure mode')).toBe('generic')
  })
})
