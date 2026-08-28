import { describe, expect, it } from 'vitest'
import {
  EMAIL_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  normalizeEmail,
  normalizeUsername,
  validateEmail,
  validatePassword,
  validateUsername,
} from '@/features/auth/validation'

describe('auth field validators (return i18n keys, null = valid)', () => {
  it('accepts a normal email and rejects junk', () => {
    expect(validateEmail('ada@example.com')).toBeNull()
    expect(validateEmail('  ada@example.com  ')).toBeNull() // schema trims first
    expect(validateEmail('not-an-email')).toBe('auth.validation.email')
    expect(validateEmail('')).toBe('auth.validation.email')
    expect(validateEmail(`${'a'.repeat(EMAIL_MAX_LENGTH)}@example.com`)).toBe(
      'auth.validation.email',
    )
  })

  it('requires 8+ chars with lowercase, uppercase, a digit, and a symbol', () => {
    expect(validatePassword('Agent47!')).toBeNull()
    expect(validatePassword('agent47!')).toBe('auth.validation.password')
    expect(validatePassword('AGENT47!')).toBe('auth.validation.password')
    expect(validatePassword('AgentOnly!')).toBe('auth.validation.password')
    expect(validatePassword('Agent470')).toBe('auth.validation.password')
    expect(validatePassword('Aa1!')).toBe('auth.validation.password')
    expect(validatePassword('')).toBe('auth.validation.password')
  })

  it('enforces the DB username CHECK: ^[a-z0-9_]{3,20}$', () => {
    expect(validateUsername('neo')).toBeNull()
    expect(validateUsername('agent_47')).toBeNull()
    expect(validateUsername('a'.repeat(USERNAME_MAX_LENGTH))).toBeNull()
    expect(validateUsername('ab')).toBe('auth.validation.username') // too short
    expect(validateUsername('a'.repeat(USERNAME_MAX_LENGTH + 1))).toBe('auth.validation.username') // too long
    expect(validateUsername('Neo')).toBe('auth.validation.username') // uppercase
    expect(validateUsername('neo!')).toBe('auth.validation.username') // symbol
    expect(validateUsername('ne o')).toBe('auth.validation.username') // space
  })

  it('normalizers trim, and lowercase usernames (citext treats Ada == ada anyway)', () => {
    expect(normalizeEmail('  ada@example.com ')).toBe('ada@example.com')
    expect(normalizeUsername('  AgEnT_47 ')).toBe('agent_47')
  })
})
