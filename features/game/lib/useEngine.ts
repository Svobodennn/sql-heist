'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Level } from '@/lib/schema/level'
import type { LevelSession } from '@/lib/engine/levelSession'
import type { ExecutionResult } from '@/lib/engine/sqlRunner'

// Client-only engine lifecycle (docs/01-architecture.md §2.1, §7.1). The WASM
// engine is imported DYNAMICALLY inside the effect so it is code-split away from
// the landing/board bundles — nothing SSR-renders sql.js. The imperative
// LevelSession lives in a ref (never React state → no re-render churn) and is
// disposed on unmount. Exposes loading|ready|error + retry (graceful degradation,
// risk R3).

export type EngineStatus = 'loading' | 'ready' | 'error'

export interface UseEngine {
  status: EngineStatus
  run: (inputs: Record<string, string>) => ExecutionResult | null
  reset: () => void
  retry: () => void
}

export function useEngine(level: Level): UseEngine {
  const sessionRef = useRef<LevelSession | null>(null)
  const [status, setStatus] = useState<EngineStatus>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    let localSession: LevelSession | null = null
    setStatus('loading')

    void (async () => {
      try {
        const { createSqlEngine } = await import('@/lib/engine/levelSession')
        const engine = createSqlEngine()
        await engine.init()
        const session = await engine.openLevel(level)
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
  }, [level, attempt])

  const run = useCallback((inputs: Record<string, string>): ExecutionResult | null => {
    return sessionRef.current ? sessionRef.current.run(inputs) : null
  }, [])

  // Fresh DB per run so a destructive payload can't poison the next attempt (§2.2).
  const reset = useCallback(() => {
    sessionRef.current?.reset()
  }, [])

  const retry = useCallback(() => setAttempt((a) => a + 1), [])

  return { status, run, reset, retry }
}
