'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useAuth } from '@/features/auth/useAuth'
import { fetchServerProgress, mergeCaseProgress, subtractCaseProgress } from './progressSync'

// Per-objective case progress (docs/cases-design.md — "Progress in localStorage:
// per-objective completion within a case; case done when all pass"). On-device
// only at its core; authenticated sync is layered into the hook below. It stays a
// SEPARATE key + shape from the jobs' useProgress so the two tracks never collide.

// Which objective ids are cleared, per case id. A case is complete once all of
// its objective ids appear here.
export type CaseProgressMap = Record<string, { objectives: string[] }>

const STORAGE_KEY = 'sql-heist:cases:v1'
const ACCOUNT_STORAGE_PREFIX = 'sql-heist:cases:user:'
const ANONYMOUS_SCOPE = 'anonymous'

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

export function accountCaseProgressStorageKey(userId: string): string {
  return `${ACCOUNT_STORAGE_PREFIX}${userId}:v1`
}

export function readAccountCaseProgress(userId: string): CaseProgressMap {
  if (typeof window === 'undefined' || !userId) return {}
  try {
    const raw = window.localStorage.getItem(accountCaseProgressStorageKey(userId))
    if (!raw) return {}
    const parsed = caseProgressSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : {}
  } catch {
    return {}
  }
}

export function cacheAccountCaseProgress(userId: string, records: CaseProgressMap): boolean {
  if (typeof window === 'undefined' || !userId) return false
  try {
    window.localStorage.setItem(accountCaseProgressStorageKey(userId), JSON.stringify(records))
    return true
  } catch {
    return false
  }
}

export function recordAccountObjectiveWin(
  userId: string,
  caseId: string,
  objectiveId: string,
): void {
  const records = readAccountCaseProgress(userId)
  const completed = new Set(records[caseId]?.objectives ?? [])
  completed.add(objectiveId)
  cacheAccountCaseProgress(userId, {
    ...records,
    [caseId]: { objectives: [...completed] },
  })
}

export function claimAnonymousCaseProgress(userId: string): CaseProgressMap {
  const anonymous = readCaseProgress()
  const claimed = mergeCaseProgress(readAccountCaseProgress(userId), anonymous)
  if (!cacheAccountCaseProgress(userId, claimed) || typeof window === 'undefined') return claimed

  try {
    const remaining = subtractCaseProgress(readCaseProgress(), anonymous)
    if (Object.keys(remaining).length === 0) window.localStorage.removeItem(STORAGE_KEY)
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining))
  } catch {
    // The account copy is already safe; a duplicate anonymous cache is harmless.
  }
  return claimed
}

export function completedObjectiveIds(caseId: string, records: CaseProgressMap): Set<string> {
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
  const { status: authStatus, user } = useAuth()
  const userId = user?.id ?? null
  const [records, setRecords] = useState<CaseProgressMap>({})
  const [ready, setReady] = useState(false)
  const [recordsScope, setRecordsScope] = useState<string | null>(null)
  const [serverReadyFor, setServerReadyFor] = useState<string | null>(null)

  useEffect(() => {
    setRecords(readCaseProgress())
    setRecordsScope(ANONYMOUS_SCOPE)
    setReady(true)
  }, [])

  useEffect(() => {
    if (authStatus === 'loading') {
      setServerReadyFor(null)
      return
    }
    if (authStatus !== 'authed' || !userId) {
      setRecords(readCaseProgress())
      setRecordsScope(ANONYMOUS_SCOPE)
      setServerReadyFor(null)
      return
    }

    let cancelled = false
    const local = mergeCaseProgress(readAccountCaseProgress(userId), readCaseProgress())
    setRecords(local)
    setRecordsScope(userId)
    setServerReadyFor(null)

    const syncServerProgress = async () => {
      try {
        const server = await fetchServerProgress()
        if (cancelled) return
        const merged = mergeCaseProgress(local, server)
        cacheAccountCaseProgress(userId, merged)
        setRecords(merged)
      } catch {
        // The local cache remains authoritative while the network is unavailable.
      } finally {
        if (!cancelled) setServerReadyFor(userId)
      }
    }

    void syncServerProgress()
    return () => {
      cancelled = true
    }
  }, [authStatus, userId])

  const syncedReady =
    authStatus === 'loading'
      ? false
      : authStatus === 'authed' && userId
        ? ready && recordsScope === userId && serverReadyFor === userId
        : ready && recordsScope === ANONYMOUS_SCOPE

  return { records, ready: syncedReady }
}
