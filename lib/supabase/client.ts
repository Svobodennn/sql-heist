import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Publishable values, inlined by Next at build time. Both are PUBLIC by design
// (RLS is the security boundary, not key secrecy). Absence of either simply turns
// every account surface off — the game itself never needs Supabase.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Build-time constant — identical at prerender and hydration (the inlined env is
// the same in both), so components may branch on it during render without a
// mismatch. Unlike getSupabase() it never constructs the browser client.
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
}

let cached: SupabaseClient | null | undefined

type AuthStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const PROVIDER_CREDENTIAL_KEYS = new Set(['provider_token', 'provider_refresh_token'])
const STORAGE_PROBE_KEY = 'sql-heist:auth:storage-probe'

function stripProviderCredentials(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripProviderCredentials)
  if (typeof value !== 'object' || value === null) return value

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !PROVIDER_CREDENTIAL_KEYS.has(key))
      .map(([key, field]) => [key, stripProviderCredentials(field)]),
  )
}

function sanitizeStoredValue(value: string): string {
  try {
    return JSON.stringify(stripProviderCredentials(JSON.parse(value)))
  } catch {
    return value
  }
}

// Supabase needs its own access/refresh tokens for a persistent browser session,
// but SQL Heist never calls provider APIs. Strip Google/GitHub credentials before
// they can be retained, including from a legacy value encountered on read.
export function createSafeAuthStorage(storage: AuthStorage): AuthStorage {
  return {
    getItem(key) {
      const stored = storage.getItem(key)
      if (stored === null) return null
      const safe = sanitizeStoredValue(stored)
      if (safe !== stored) storage.setItem(key, safe)
      return safe
    },
    setItem(key, value) {
      storage.setItem(key, sanitizeStoredValue(value))
    },
    removeItem(key) {
      storage.removeItem(key)
    },
  }
}

function createMemoryAuthStorage(): AuthStorage {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
    removeItem: (key) => {
      values.delete(key)
    },
  }
}

export function createBrowserAuthStorage(): AuthStorage | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const storage = window.localStorage
    storage.setItem(STORAGE_PROBE_KEY, '1')
    storage.removeItem(STORAGE_PROBE_KEY)
    return createSafeAuthStorage(storage)
  } catch {
    try {
      window.localStorage.removeItem(STORAGE_PROBE_KEY)
    } catch {
      // The persistence surface is unavailable; the memory adapter below is clean.
    }
    // Passing `undefined` would make auth-js retry the unsanitized global
    // localStorage. An isolated adapter preserves the token filter and lets the
    // current tab work without claiming persistence is available.
    return createSafeAuthStorage(createMemoryAuthStorage())
  }
}

// Single cached instance — a second GoTrueClient in the same tab corrupts session
// state. `null` (env missing) means auth is off and every caller must no-op.
export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached
  cached =
    SUPABASE_URL && SUPABASE_ANON_KEY
      ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            // The static /auth/callback page relies on the client consuming the
            // PKCE `?code=` itself — there is no server to exchange it.
            detectSessionInUrl: true,
            flowType: 'pkce',
            storage: createBrowserAuthStorage(),
          },
        })
      : null
  return cached
}
