'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'

// Job-over progress (docs/01-architecture.md §7.1): completed jobs + best score,
// persisted to localStorage (no backend/account — progress stays on device).
// Linear unlock: a job opens once the previous one is completed.

export interface JobRecord {
  completed: boolean
  bestScore: number
}

export type ProgressMap = Record<string, JobRecord>

const STORAGE_KEY = 'sql-heist:progress:v1'

// localStorage is user-writable and outlives app versions, so a stored blob can be
// corrupt, truncated, or a stale/legacy shape. Validate at the boundary (mirrors
// JobRecord) instead of trusting `JSON.parse(raw) as ProgressMap`: a bad shape
// yields {} (start fresh) rather than leaking a malformed record into game state.
const progressMapSchema = z.record(
  z.object({ completed: z.boolean(), bestScore: z.number() }),
)

export function readProgress(): ProgressMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = progressMapSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : {}
  } catch {
    // Non-JSON garbage (JSON.parse throws) or storage access denied — start fresh.
    return {}
  }
}

export function recordWin(jobId: string, score: number): void {
  if (typeof window === 'undefined') return
  try {
    const map = readProgress()
    const best = Math.max(map[jobId]?.bestScore ?? 0, score)
    const next: ProgressMap = { ...map, [jobId]: { completed: true, bestScore: best } }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage disabled/full — progress simply won't persist; play continues.
  }
}

// `ready` guards against a hydration mismatch: the server renders the locked
// baseline, then the client fills real progress after mount.
export function useProgress(): { records: ProgressMap; ready: boolean } {
  const [records, setRecords] = useState<ProgressMap>({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setRecords(readProgress())
    setReady(true)
  }, [])

  return { records, ready }
}

export function isUnlocked(
  orderedIds: readonly string[],
  jobId: string,
  records: ProgressMap,
): boolean {
  const index = orderedIds.indexOf(jobId)
  if (index <= 0) return true // first job (or unknown) is always open
  return Boolean(records[orderedIds[index - 1]]?.completed)
}
