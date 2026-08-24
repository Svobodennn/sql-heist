// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearExpiredPendingEmail,
  mapAuthError,
  readPendingEmail,
  rememberPendingEmail,
} from '@/features/auth/authClient'

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

describe('pending signup email', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-23T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('is available only during the confirmation window', () => {
    rememberPendingEmail('operative@example.com')
    expect(readPendingEmail()).toBe('operative@example.com')

    vi.advanceTimersByTime(60 * 60 * 1000)

    expect(readPendingEmail()).toBeNull()
    expect(window.localStorage.length).toBe(0)
  })

  it('removes legacy or malformed values instead of retaining an address indefinitely', () => {
    window.localStorage.setItem('sql-heist:auth:pending-email', 'legacy@example.com')
    expect(readPendingEmail()).toBeNull()
    expect(window.localStorage.length).toBe(0)

    window.localStorage.setItem('sql-heist:auth:pending-email', '{broken')
    expect(readPendingEmail()).toBeNull()
    expect(window.localStorage.length).toBe(0)
  })

  it('cleans an expired address without requiring the callback to read it', () => {
    window.localStorage.setItem(
      'sql-heist:auth:pending-email',
      JSON.stringify({ email: 'expired@example.com', expiresAt: Date.now() - 1 }),
    )

    clearExpiredPendingEmail()

    expect(window.localStorage.length).toBe(0)
  })
})
