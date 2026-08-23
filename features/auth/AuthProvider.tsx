'use client'

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import * as authClient from './authClient'
import type { AuthResult, ProfileRow } from './authClient'

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
  // True once the own-profile lookup for the CURRENT user settled ("no row" is a
  // settled answer — that's what sends first-time users to the UsernameGate).
  profileReady: boolean
  status: AuthStatus
}

export interface AuthContextValue extends AuthState {
  signInEmail(email: string, password: string): Promise<AuthResult>
  signUpEmail(email: string, password: string, username: string): Promise<AuthResult>
  signOut(): Promise<void>
  refreshProfile(): Promise<void>
  adoptProfile(row: ProfileRow): void
}

const DISABLED_STATE: AuthState = { user: null, profile: null, profileReady: false, status: 'disabled' }

// Default context mirrors I18nContext: a consumer rendered outside the provider
// (or in an env-less build) sees auth as cleanly off — never a crash.
export const AuthContext = createContext<AuthContextValue>({
  ...DISABLED_STATE,
  signInEmail: async () => ({ error: 'auth-disabled' }),
  signUpEmail: async () => ({ error: 'auth-disabled' }),
  signOut: async () => {},
  refreshProfile: async () => {},
  adoptProfile: () => {},
})

// snake_case `profiles` row (RLS only ever returns the caller's) → Profile.
// ProfileRow is defined in authClient (shared with createMyProfile) to keep the
// column contract in one place.
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
    isSupabaseConfigured()
      ? { user: null, profile: null, profileReady: false, status: 'loading' }
      : DISABLED_STATE,
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
      setState((prev) => {
        // Keep an already-loaded profile while the same user stays signed in
        // (TOKEN_REFRESHED etc.); drop it on sign-out or user switch.
        const sameUser = user !== null && prev.profile?.id === user.id
        return {
          user,
          profile: sameUser ? prev.profile : null,
          profileReady: user !== null && sameUser ? prev.profileReady : false,
          status: user ? 'authed' : 'anon',
        }
      })
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
    // Read FAILURE stays un-ready (the gate must not pop over a network blip);
    // a clean "no row" resolves to ready + null → UsernameGate takes over.
    if (error) return
    setState((prev) =>
      prev.user?.id === userId
        ? { ...prev, profile: data ? toProfile(data as ProfileRow) : null, profileReady: true }
        : prev,
    )
  }, [])

  const userId = state.user?.id ?? null
  const progressMergedFor = useRef<string | null>(null)

  useEffect(() => {
    if (userId) void loadProfile(userId)
  }, [userId, loadProfile])

  const profileId = state.profile?.id ?? null

  useEffect(() => {
    if (state.status !== 'authed' || !userId) {
      progressMergedFor.current = null
      return
    }
    if (profileId !== userId || progressMergedFor.current === userId) return

    progressMergedFor.current = userId
    let active = true

    void Promise.all([
      import('@/features/game/lib/useCaseProgress'),
      import('@/features/game/lib/progressSync'),
    ])
      .then(([{ readCaseProgress }, { mergeLocalIntoServer }]) => {
        if (!active) return
        return mergeLocalIntoServer(readCaseProgress())
      })
      .catch(() => {
        // Progress stays local; a later sign-in starts a fresh handshake.
      })

    return () => {
      active = false
    }
  }, [state.status, userId, profileId])

  const signInEmail = useCallback(
    (email: string, password: string) => authClient.signInEmail(email, password),
    [],
  )

  const signUpEmail = useCallback(
    (email: string, password: string, username: string) =>
      authClient.signUpEmail(email, password, username),
    [],
  )

  const signOut = useCallback(() => authClient.signOut(), [])

  const refreshProfile = useCallback(async () => {
    if (userId) await loadProfile(userId)
  }, [userId, loadProfile])

  // Adopt a row the caller just created (UsernameGate) without a re-read.
  const adoptProfile = useCallback((row: ProfileRow) => {
    setState((prev) =>
      prev.user?.id === row.id ? { ...prev, profile: toProfile(row), profileReady: true } : prev,
    )
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signInEmail, signUpEmail, signOut, refreshProfile, adoptProfile }),
    [state, signInEmail, signUpEmail, signOut, refreshProfile, adoptProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
