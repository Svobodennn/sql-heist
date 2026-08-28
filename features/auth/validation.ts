import { z } from 'zod'

// Client-side mirror of the server rules: the DB CHECK enforces the username
// format, while Supabase Auth requires the same password length and four ASCII
// character classes. Keep the client and project Auth settings in sync.
export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/
export const USERNAME_MAX_LENGTH = 20
export const EMAIL_MAX_LENGTH = 254
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_SYMBOLS = '!@#$%^&*()_+-=[]{};\'\\:"|<>?,./`~'

export const emailSchema = z.string().trim().max(EMAIL_MAX_LENGTH).email()
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/)
  .refine((value) => [...PASSWORD_SYMBOLS].some((symbol) => value.includes(symbol)))
export const usernameSchema = z.string().regex(USERNAME_PATTERN)

// Field validators return an i18n key (UI never shows raw zod messages).
export function validateEmail(value: string): string | null {
  return emailSchema.safeParse(value).success ? null : 'auth.validation.email'
}

export function validatePassword(value: string): string | null {
  return passwordSchema.safeParse(value).success ? null : 'auth.validation.password'
}

export function validateUsername(value: string): string | null {
  return usernameSchema.safeParse(value).success ? null : 'auth.validation.username'
}

// What we submit: trimmed email, trimmed+lowercased username (the DB stores
// lowercase-only; citext would accept 'Ada' as a duplicate of 'ada' anyway).
export function normalizeEmail(value: string): string {
  return value.trim()
}

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase()
}
