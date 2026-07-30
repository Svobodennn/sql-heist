'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Case } from '@/lib/schema/case'
import type { CaseSession } from '@/lib/engine/caseSession'
import type { RunResult } from '@/lib/engine/levelSession'
import type { EngineStatus } from './useEngine'

// Client-only case-engine lifecycle — the case twin of useEngine (docs/
// 01-architecture.md §2.1, §7.1 + docs/cases-design.md "persistent case-session").
// The WASM engine is imported DYNAMICALLY inside the effect so it stays code-split
// away from the board/landing bundles. Unlike useEngine (fresh DB per level), ONE
// persistent CaseSession is opened per case and held in a ref (never React state →
// no re-render churn); it carries the shared DB + per-objective snapshots across
// objectives and is disposed on unmount. Exposes loading|ready|error + retry
// (graceful degradation, risk R3). EngineStatus is re-exported from useEngine so
// the shared leaf components (EngineLoader) accept it as the exact same type.
export type { EngineStatus }

export interface UseCaseEngine {
  status: EngineStatus
  // Restores to this objective's start snapshot, then composes + execs its
  // template — so every attempt is deterministic (docs/cases-design.md). Returns
  // null until the engine is ready.
  run: (objectiveIndex: number, inputs: Record<string, string>) => RunResult | null
  // Call AFTER a winning run to advance the snapshot: the current DB (incl. that
  // run's writes) becomes the start state for the next objective (Model A).
  commit: (objectiveIndex: number) => void
  reset: () => void
  retry: () => void
}

export function useCaseEngine(gameCase: Case): UseCaseEngine {
  const sessionRef = useRef<CaseSession | null>(null)
  const [status, setStatus] = useState<EngineStatus>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    let localSession: CaseSession | null = null
    setStatus('loading')

    void (async () => {
      try {
        const { createCaseEngine } = await import('@/lib/engine/caseSession')
        const engine = createCaseEngine()
        await engine.init()
        const session = await engine.openCase(gameCase)
        if (cancelled) {
          session.dispose()
          return
        }
        localSession = session
        sessionRef.current = session
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()

    return () => {
      cancelled = true
      localSession?.dispose()
      if (sessionRef.current === localSession) sessionRef.current = null
    }
  }, [gameCase, attempt])

  const run = useCallback(
    (objectiveIndex: number, inputs: Record<string, string>): RunResult | null => {
      return sessionRef.current ? sessionRef.current.runObjective(objectiveIndex, inputs) : null
    },
    [],
  )

  const commit = useCallback((objectiveIndex: number) => {
    sessionRef.current?.commitObjective(objectiveIndex)
  }, [])

  // Rebuild the whole case DB from schema+seed (drops every snapshot). Used by the
  // engine-error retry path, not by per-objective attempts — runObjective already
  // restores to the objective's start snapshot, so a retry needs no reset().
  const reset = useCallback(() => {
    sessionRef.current?.reset()
  }, [])

  const retry = useCallback(() => setAttempt((a) => a + 1), [])

  return { status, run, commit, reset, retry }
}
