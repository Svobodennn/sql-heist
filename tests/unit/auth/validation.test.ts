import { describe, expect, it } from 'vitest'
import {
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
  })

  it('enforces the 8-char password minimum (mirrors the Supabase auth setting)', () => {
    expect(validatePassword('12345678')).toBeNull()
    expect(validatePassword('1234567')).toBe('auth.validation.password')
    expect(validatePassword('')).toBe('auth.validation.password')
  })

  it('enforces the DB username CHECK: ^[a-z0-9_]{3,20}$', () => {
    expect(validateUsername('neo')).toBeNull()
    expect(validateUsername('agent_47')).toBeNull()
    expect(validateUsername('a'.repeat(20))).toBeNull()
    expect(validateUsername('ab')).toBe('auth.validation.username') // too short
    expect(validateUsername('a'.repeat(21))).toBe('auth.validation.username') // too long
    expect(validateUsername('Neo')).toBe('auth.validation.username') // uppercase
    expect(validateUsername('neo!')).toBe('auth.validation.username') // symbol
    expect(validateUsername('ne o')).toBe('auth.validation.username') // space
  })

  it('normalizers trim, and lowercase usernames (citext treats Ada == ada anyway)', () => {
    expect(normalizeEmail('  ada@example.com ')).toBe('ada@example.com')
    expect(normalizeUsername('  AgEnT_47 ')).toBe('agent_47')
  })
})
