import { OAUTH_PROVIDERS, type OAuthProvider } from './oauthProfile'

const OAUTH_ATTEMPT_KEY = 'sql-heist:auth:oauth-attempt'
const DELETION_RECEIPT_KEY = 'sql-heist:auth:deletion-reauth'
const ATTEMPT_TTL_MS = 10 * 60 * 1000
const DELETION_RECEIPT_TTL_MS = 2 * 60 * 1000

const ALLOWED_RETURN_PATHS = new Set(['/', '/tr', '/pl', '/account', '/tr/account', '/pl/account'])

export type OAuthAttempt =
  | { purpose: 'sign-in'; returnTo: string }
  | { purpose: 'account-deletion'; returnTo: string; expectedUserId: string }

interface StoredOAuthAttempt {
  provider: OAuthProvider
  purpose: OAuthAttempt['purpose']
  returnTo: string
  expectedUserId?: string
  expiresAt: number
}

interface DeletionReauthReceipt {
  userId: string
  expiresAt: number
}

function safeReturnPath(returnTo: unknown): string {
  return typeof returnTo === 'string' && ALLOWED_RETURN_PATHS.has(returnTo) ? returnTo : '/'
}

function removeStorageItem(key: string): void {
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    // Storage can be unavailable in hardened/private browser contexts.
  }
}

function takeStorageItem(key: string): string | null {
  try {
    const value = window.sessionStorage.getItem(key)
    window.sessionStorage.removeItem(key)
    return value
  } catch {
    return null
  }
}

function isOAuthProvider(value: unknown): value is OAuthProvider {
  return typeof value === 'string' && OAUTH_PROVIDERS.includes(value as OAuthProvider)
}

export function rememberOAuthAttempt(provider: OAuthProvider, attempt: OAuthAttempt): boolean {
  const stored: StoredOAuthAttempt = {
    provider,
    purpose: attempt.purpose,
    returnTo: safeReturnPath(attempt.returnTo),
    expiresAt: Date.now() + ATTEMPT_TTL_MS,
    ...(attempt.purpose === 'account-deletion' ? { expectedUserId: attempt.expectedUserId } : {}),
  }

  try {
    window.sessionStorage.removeItem(DELETION_RECEIPT_KEY)
    window.sessionStorage.setItem(OAUTH_ATTEMPT_KEY, JSON.stringify(stored))
    return true
  } catch {
    // OAuth needs this caller-bound state for cleanup and safe return routing.
    return false
  }
}

export function peekOAuthProvider(): OAuthProvider | null {
  try {
    const raw = window.sessionStorage.getItem(OAUTH_ATTEMPT_KEY)
    if (!raw) return null
    const attempt = JSON.parse(raw) as Partial<StoredOAuthAttempt>
    if (
      !isOAuthProvider(attempt.provider) ||
      typeof attempt.expiresAt !== 'number' ||
      !Number.isFinite(attempt.expiresAt) ||
      Date.now() >= attempt.expiresAt
    ) {
      removeStorageItem(OAUTH_ATTEMPT_KEY)
      return null
    }
    return attempt.provider
  } catch {
    removeStorageItem(OAUTH_ATTEMPT_KEY)
    return null
  }
}

export function clearOAuthAttempt(): void {
  removeStorageItem(OAUTH_ATTEMPT_KEY)
}

export function completeOAuthAttempt(authenticatedUserId: string): string {
  const raw = takeStorageItem(OAUTH_ATTEMPT_KEY)
  if (!raw) return '/'

  try {
    const attempt = JSON.parse(raw) as Partial<StoredOAuthAttempt>
    if (
      typeof attempt.expiresAt !== 'number' ||
      !Number.isFinite(attempt.expiresAt) ||
      Date.now() >= attempt.expiresAt
    ) {
      return '/'
    }

    const returnTo = safeReturnPath(attempt.returnTo)
    if (attempt.purpose !== 'account-deletion') return returnTo
    if (
      typeof attempt.expectedUserId !== 'string' ||
      attempt.expectedUserId !== authenticatedUserId
    ) {
      removeStorageItem(DELETION_RECEIPT_KEY)
      return '/'
    }

    const receipt: DeletionReauthReceipt = {
      userId: authenticatedUserId,
      expiresAt: Date.now() + DELETION_RECEIPT_TTL_MS,
    }
    window.sessionStorage.setItem(DELETION_RECEIPT_KEY, JSON.stringify(receipt))
    return returnTo
  } catch {
    removeStorageItem(DELETION_RECEIPT_KEY)
    return '/'
  }
}

export function consumeDeletionReauthReceipt(authenticatedUserId: string): boolean {
  const raw = takeStorageItem(DELETION_RECEIPT_KEY)
  if (!raw) return false

  try {
    const receipt = JSON.parse(raw) as Partial<DeletionReauthReceipt>
    return (
      receipt.userId === authenticatedUserId &&
      typeof receipt.expiresAt === 'number' &&
      Number.isFinite(receipt.expiresAt) &&
      Date.now() < receipt.expiresAt
    )
  } catch {
    return false
  }
}
