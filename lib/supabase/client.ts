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
          },
        })
      : null
  return cached
}
