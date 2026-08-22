'use client'

import { useEffect, useState } from 'react'
import { usernameAvailable } from './authClient'
import { normalizeUsername, validateUsername } from './validation'

export type Availability = 'idle' | 'checking' | 'available' | 'taken'

export const USERNAME_PROBE_DEBOUNCE_MS = 450

// Debounced best-effort availability probe, shared by SignUpForm + UsernameGate.
// A per-effect `cancelled` flag is the crux: clearTimeout stops a not-yet-fired
// timer, but a request already in flight for a STALE candidate would otherwise
// resolve and overwrite the current state (a free username shown as "taken",
// blocking submit). The flag drops any resolution from a superseded effect.
export function useUsernameAvailability(rawUsername: string, enabled = true): Availability {
  const [availability, setAvailability] = useState<Availability>('idle')

  useEffect(() => {
    if (!enabled) {
      setAvailability('idle')
      return
    }
    const candidate = normalizeUsername(rawUsername)
    if (validateUsername(candidate) !== null) {
      setAvailability('idle')
      return
    }
    setAvailability('checking')
    let cancelled = false
    const timer = setTimeout(() => {
      void usernameAvailable(candidate).then((available) => {
        if (cancelled) return
        setAvailability(available === null ? 'idle' : available ? 'available' : 'taken')
      })
    }, USERNAME_PROBE_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [rawUsername, enabled])

  return availability
}
