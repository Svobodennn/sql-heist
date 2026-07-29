'use client'

import { useCallback, useEffect, useReducer, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, type Transition } from 'framer-motion'
import { useRouter } from 'next/navigation'
import type { Level } from '@/lib/schema/level'
import { evaluate, toWinContext } from '@/lib/engine/winEvaluator'
import { shouldSuggestHint } from '@/lib/engine/scoring'
import { makeInitialState, reducer, type Phase } from '../lib/phaseMachine'
import { useEngine } from '../lib/useEngine'
import { useToasts } from '../lib/useToasts'
import { recordWin } from '../lib/useProgress'
import { BriefPanel } from './BriefPanel'
import { ReconPanel } from './ReconPanel'
import { ExploitConsole } from './ExploitConsole'
import { LootBanner } from './LootBanner'
import { DebriefPanel } from './DebriefPanel'
import { TopBar } from './TopBar'
import { ToastStack } from './Toast'
import styles from './JobPlayer.module.css'

// The single orchestrator (docs/01-architecture.md §1.2). Drives the phase
// machine (useReducer), owns the imperative engine session (useEngine → useRef,
// disposed on unmount), and swaps phase content under a persistent shell. All
// engine calls — compose, exec, evaluate — go through the FROZEN lib/engine.
export function JobPlayer({ level, nextJobId }: { level: Level; nextJobId?: string }) {
  const router = useRouter()
  const reduce = useReducedMotion()
  const [state, dispatch] = useReducer(reducer, level, makeInitialState)
  const { status, run, reset, retry } = useEngine(level)
  const { toasts, push, dismiss } = useToasts()
  const [muted, setMuted] = useState(false)
  const [replays, setReplays] = useState(0)

  // Timer only ticks during exploit (§2 — reading the brief is free).
  useEffect(() => {
    if (state.phase !== 'exploit') return
    const id = setInterval(() => dispatch({ type: 'TICK' }), 1000)
    return () => clearInterval(id)
  }, [state.phase])

  // Persist best score once the win lands in loot.
  useEffect(() => {
    if (state.phase === 'loot' && state.score != null) {
      recordWin(level.id, state.score)
    }
  }, [state.phase, state.score, level.id])

  const handleRun = useCallback(() => {
    const result = run(state.inputs)
    if (!result) return // engine not ready yet
    const evaluation = evaluate(level.winCondition, toWinContext(result, state.inputs))
    dispatch({ type: 'RUN', result, evaluation })

    if (evaluation.won) {
      push('success', 'Loot secured — moving to the score.')
    } else if (result.error) {
      push('error', 'SQLite rejected that statement — read the error readout.')
    } else {
      push('info', evaluation.reason)
    }
  }, [run, state.inputs, level.winCondition, push])

  const handleReset = useCallback(() => {
    reset()
    dispatch({ type: 'RESET_ATTEMPT' })
  }, [reset])

  const handleReplay = useCallback(() => {
    reset()
    setReplays((r) => r + 1)
    dispatch({ type: 'RESTART' })
  }, [reset])

  const handleNext = useCallback(() => {
    if (nextJobId) router.push(`/jobs/${nextJobId}`)
  }, [nextJobId, router])

  const suggestHint = shouldSuggestHint(state.failedRuns, state.elapsedSec)

  const transition: Transition = reduce
    ? { duration: 0 }
    : { duration: 0.22, ease: [0.16, 1, 0.3, 1] }

  return (
    <div className={styles.shell}>
      <TopBar
        jobTitle={level.job}
        phase={state.phase}
        elapsedSec={state.elapsedSec}
        score={state.score}
        muted={muted}
        onToggleMute={() => setMuted((m) => !m)}
      />

      <main className={styles.main}>
        <AnimatePresence mode="wait">
          <motion.div
            key={state.phase as Phase}
            initial={{ opacity: 0, x: reduce ? 0 : -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reduce ? 0 : 6 }}
            transition={transition}
          >
            {state.phase === 'brief' && (
              <BriefPanel
                level={level}
                engineStatus={status}
                onTakeJob={() => dispatch({ type: 'ADVANCE' })}
              />
            )}

            {state.phase === 'recon' && (
              <ReconPanel level={level} onMoveIn={() => dispatch({ type: 'ADVANCE' })} />
            )}

            {state.phase === 'exploit' && (
              <ExploitConsole
                level={level}
                inputs={state.inputs}
                lastResult={state.lastResult}
                engineStatus={status}
                hints={level.hints}
                openedTiers={state.openedHintTiers}
                suggestHint={suggestHint}
                onChange={(field, value) => dispatch({ type: 'SET_INPUT', field, value })}
                onRun={handleRun}
                onReset={handleReset}
                onRetry={retry}
                onOpenHint={(tier) => dispatch({ type: 'OPEN_HINT', tier })}
              />
            )}

            {state.phase === 'loot' && state.winningInputs && state.score != null && state.stars && (
              <LootBanner
                level={level}
                winningInputs={state.winningInputs}
                result={state.lastResult}
                failedRuns={state.failedRuns}
                openedTiers={state.openedHintTiers}
                elapsedSec={state.elapsedSec}
                score={state.score}
                stars={state.stars}
                onDebrief={() => dispatch({ type: 'GOTO', phase: 'debrief' })}
              />
            )}

            {state.phase === 'debrief' && state.winningInputs && (
              <DebriefPanel
                level={level}
                winningInputs={state.winningInputs}
                isReplay={replays > 0}
                hasNextJob={Boolean(nextJobId)}
                onNext={handleNext}
                onReplay={handleReplay}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
