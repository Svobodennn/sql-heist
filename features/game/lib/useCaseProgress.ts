'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useAuth } from '@/features/auth/useAuth'
import { fetchServerProgress, mergeCaseProgress } from './progressSync'

// Per-objective case progress (docs/cases-design.md — "Progress in localStorage:
// per-objective completion within a case; case done when all pass"). On-device
// only at its core; authenticated sync is layered into the hook below. It stays a
// SEPARATE key + shape from the jobs' useProgress so the two tracks never collide.

// Which objective ids are cleared, per case id. A case is complete once all of
// its objective ids appear here.
export type CaseProgressMap = Record<string, { objectives: string[] }>

const STORAGE_KEY = 'sql-heist:cases:v1'

// localStorage is user-writable and outlives app versions, so a stored blob can be
// corrupt, truncated, or a legacy shape. Validate at the boundary instead of
// trusting `JSON.parse(raw) as CaseProgressMap`: a bad shape yields {} (start
// fresh) rather than leaking malformed state into the game.
const caseProgressSchema = z.record(z.object({ objectives: z.array(z.string()) }))

export function readCaseProgress(): CaseProgressMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = caseProgressSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : {}
  } catch {
    // Non-JSON garbage (JSON.parse throws) or storage access denied — start fresh.
    return {}
  }
}

export function recordObjectiveWin(caseId: string, objectiveId: string): void {
  if (typeof window === 'undefined') return
  try {
    const map = readCaseProgress()
    const done = new Set(map[caseId]?.objectives ?? [])
    done.add(objectiveId)
    const next: CaseProgressMap = { ...map, [caseId]: { objectives: [...done] } }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage disabled/full — progress simply won't persist; play continues.
  }
}

export function completedObjectiveIds(
  caseId: string,
  records: CaseProgressMap,
): Set<string> {
  return new Set(records[caseId]?.objectives ?? [])
}

export interface CaseCompletion {
  done: number
  total: number
  complete: boolean
}

// Board-facing rollup: how many of a case's objectives are cleared. Counts only
// ids the case actually declares, so a stale id in storage can't inflate it.
export function caseCompletion(
  caseId: string,
  objectiveIds: readonly string[],
  records: CaseProgressMap,
): CaseCompletion {
  const done = completedObjectiveIds(caseId, records)
  const doneCount = objectiveIds.filter((id) => done.has(id)).length
  return {
    done: doneCount,
    total: objectiveIds.length,
    complete: objectiveIds.length > 0 && doneCount >= objectiveIds.length,
  }
}

// `ready` guards a hydration mismatch: the server renders the empty baseline, then
// the client fills real progress after mount (mirrors useProgress).
export function useCaseProgress(): { records: CaseProgressMap; ready: boolean } {
  const { status: authStatus } = useAuth()
  const [records, setRecords] = useState<CaseProgressMap>({})
  const [ready, setReady] = useState(false)
  const [serverReady, setServerReady] = useState(false)

  useEffect(() => {
    setRecords(readCaseProgress())
    setReady(true)
  }, [])

  useEffect(() => {
    if (authStatus !== 'authed') {
      setServerReady(false)
      return
    }

    let cancelled = false
    setServerReady(false)

    const syncServerProgress = async () => {
      try {
        const server = await fetchServerProgress()
        if (cancelled) return

        for (const [caseId, progress] of Object.entries(server)) {
          for (const objectiveId of progress.objectives) {
            recordObjectiveWin(caseId, objectiveId)
          }
        }

        setRecords(mergeCaseProgress(readCaseProgress(), server))
      } catch {
        // The local cache remains authoritative while the network is unavailable.
      } finally {
        if (!cancelled) setServerReady(true)
      }
    }

    void syncServerProgress()
    return () => {
      cancelled = true
    }
  }, [authStatus])

  const syncedReady =
    authStatus === 'loading' ? false : authStatus === 'authed' ? ready && serverReady : ready

  return { records, ready: syncedReady }
}
