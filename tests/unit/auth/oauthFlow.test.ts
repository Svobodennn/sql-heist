// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearOAuthAttempt,
  completeOAuthAttempt,
  consumeDeletionReauthReceipt,
  peekOAuthProvider,
  rememberOAuthAttempt,
} from '@/features/auth/oauthFlow'

describe('OAuth return flow', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-26T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns a normal sign-in to an allow-listed localized route', () => {
    rememberOAuthAttempt('google', { purpose: 'sign-in', returnTo: '/tr' })

    expect(peekOAuthProvider()).toBe('google')
    expect(completeOAuthAttempt('user-1')).toBe('/tr')
    expect(peekOAuthProvider()).toBeNull()
    expect(completeOAuthAttempt('user-1')).toBe('/')
    expect(consumeDeletionReauthReceipt('user-1')).toBe(false)
  })

  it('issues a one-time deletion receipt only for the expected authenticated user', () => {
    rememberOAuthAttempt('github', {
      purpose: 'account-deletion',
      returnTo: '/pl/account',
      expectedUserId: 'user-1',
    })

    expect(completeOAuthAttempt('user-1')).toBe('/pl/account')
    expect(consumeDeletionReauthReceipt('user-1')).toBe(true)
    expect(consumeDeletionReauthReceipt('user-1')).toBe(false)
  })

  it('rejects a mismatched deletion identity and does not issue a receipt', () => {
    rememberOAuthAttempt('github', {
      purpose: 'account-deletion',
      returnTo: '/account',
      expectedUserId: 'user-1',
    })

    expect(completeOAuthAttempt('user-2')).toBe('/')
    expect(consumeDeletionReauthReceipt('user-1')).toBe(false)
    expect(consumeDeletionReauthReceipt('user-2')).toBe(false)
  })

  it('falls back home for external destinations and expires stale attempts', () => {
    rememberOAuthAttempt('google', {
      purpose: 'sign-in',
      returnTo: 'https://evil.example/steal',
    })
    expect(completeOAuthAttempt('user-1')).toBe('/')

    rememberOAuthAttempt('google', { purpose: 'sign-in', returnTo: '/account' })
    vi.advanceTimersByTime(10 * 60 * 1000 + 1)
    expect(peekOAuthProvider()).toBeNull()
    expect(completeOAuthAttempt('user-1')).toBe('/')
  })

  it('clears an abandoned attempt explicitly', () => {
    rememberOAuthAttempt('github', { purpose: 'sign-in', returnTo: '/pl' })
    clearOAuthAttempt()

    expect(peekOAuthProvider()).toBeNull()
    expect(completeOAuthAttempt('user-1')).toBe('/')
  })
})
