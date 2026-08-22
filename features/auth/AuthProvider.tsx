'use client'

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'

export type AuthStatus = 'loading' | 'anon' | 'authed' | 'disabled'

export interface Profile {
  id: string
  username: string
  displayName: string | null
  country: string | null
  leaderboardOptIn: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthState {
  user: User | null
  profile: Profile | null
  status: AuthStatus
}

export interface AuthContextValue extends AuthState {
  signInEmail(email: string, password: string): Promise<{ error?: string }>
  signUpEmail(email: string, password: string, username: string): Promise<{ error?: string }>
  signOut(): Promise<void>
  refreshProfile(): Promise<void>
}

const DISABLED_STATE: AuthState = { user: null, profile: null, status: 'disabled' }

// Default context mirrors I18nContext: a consumer rendered outside the provider
// (or in an env-less build) sees auth as cleanly off — never a crash.
export const AuthContext = createContext<AuthContextValue>({
  ...DISABLED_STATE,
  signInEmail: async () => ({ error: 'auth-disabled' }),
  signUpEmail: async () => ({ error: 'auth-disabled' }),
  signOut: async () => {},
  refreshProfile: async () => {},
})

// Own `profiles` row (snake_case) → Profile. RLS only ever returns the caller's row.
interface ProfileRow {
  id: string
  username: string
  display_name: string | null
  country: string | null
  leaderboard_opt_in: boolean
  created_at: string
  updated_at: string
}

const PROFILE_COLUMNS = 'id, username, display_name, country, leaderboard_opt_in, created_at, updated_at'

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    country: row.country,
    leaderboardOptIn: row.leaderboard_opt_in,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // isSupabaseConfigured() is a build-time constant, so prerender and hydration
  // agree on the initial status: env-less builds start (and stay) 'disabled';
  // configured builds start 'loading' until the stored session is read.
  const [state, setState] = useState<AuthState>(() =>
    isSupabaseConfigured() ? { user: null, profile: null, status: 'loading' } : DISABLED_STATE,
  )

  // Session lifecycle. onAuthStateChange fires INITIAL_SESSION on subscribe, so it
  // is the single source of truth for 'loading' → 'anon'/'authed'. The callback
  // stays synchronous — supabase-js holds an internal lock while it runs, and an
  // awaited client call inside it can deadlock; profile loading lives below.
  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null
      setState((prev) => ({
        user,
        // Keep an already-loaded profile while the same user stays signed in
        // (TOKEN_REFRESHED etc.); drop it on sign-out or user switch.
        profile: user && prev.profile?.id === user.id ? prev.profile : null,
        status: user ? 'authed' : 'anon',
      }))
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const loadProfile = useCallback(async (userId: string) => {
    const supabase = getSupabase()
    if (!supabase) return
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle()
    // Read failure is treated as "no profile yet" — P1's UsernameGate owns creation.
    if (error) return
    setState((prev) =>
      prev.user?.id === userId
        ? { ...prev, profile: data ? toProfile(data as ProfileRow) : null }
        : prev,
    )
  }, [])

  const userId = state.user?.id ?? null

  useEffect(() => {
    if (userId) void loadProfile(userId)
  }, [userId, loadProfile])

  const signInEmail = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase()
    if (!supabase) return { error: 'auth-disabled' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? { error: error.message } : {}
  }, [])

  const signUpEmail = useCallback(async (email: string, password: string, username: string) => {
    const supabase = getSupabase()
    if (!supabase) return { error: 'auth-disabled' }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Captured as metadata now; the profiles row itself is created by P1's
        // UsernameGate after the first confirmed sign-in (RLS insert-self).
        data: { username },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return error ? { error: error.message } : {}
  }, [])

  const signOut = useCallback(async () => {
    await getSupabase()?.auth.signOut()
  }, [])

  const refreshProfile = useCallback(async () => {
    if (userId) await loadProfile(userId)
  }, [userId, loadProfile])

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signInEmail, signUpEmail, signOut, refreshProfile }),
    [state, signInEmail, signUpEmail, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
