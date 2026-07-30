'use client'

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import {
  AnimatePresence,
  LazyMotion,
  domAnimation,
  m,
  useReducedMotion,
  type Transition,
} from 'framer-motion'
import { useRouter } from 'next/navigation'
import type { Level } from '@/lib/schema/level'
import { evaluate, toWinContext } from '@/lib/engine/winEvaluator'
import { compose } from '@/lib/engine/queryComposer'
import { deriveSignal } from '@/lib/engine/signal'
import { shouldSuggestHint } from '@/lib/engine/scoring'
import { PHASE_LABELS, makeInitialState, previousPhase, reducer } from '../lib/phaseMachine'
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
//
// LazyMotion (features={domAnimation}) keeps only the DOM-animation feature set
// in the /jobs/[jobId] bundle: every animated child uses `m.*` instead of the
// full `motion.*`, saving ~18-32kB gz off this route (web-perf P1). No `layout`
// animations are used, so domAnimation (not domMax) is sufficient. `strict` makes
// a stray `motion.*` (which would silently no-op without loaded features) throw a
// visible dev error, so the m.*-only contract can't rot. The provider wraps this
// component's ENTIRE render output — TopBar, the phase content, AND the toast
// stack — so every motion child is covered even if a toast is later portalled.
// NOTE: if a motion consumer OUTSIDE JobPlayer (e.g. a board-level animation) ever
// appears, this provider must move up to the app root so it still wraps it —
// LazyMotion only governs its own subtree.
export function JobPlayer({ level, nextJobId }: { level: Level; nextJobId?: string }) {
  const router = useRouter()
  const reduce = useReducedMotion()
  const [state, dispatch] = useReducer(reducer, level, makeInitialState)
  const { status, run, reset, retry } = useEngine(level)
  const { toasts, push, dismiss } = useToasts()
  const [muted, setMuted] = useState(false)
  const [replays, setReplays] = useState(0)
  const mainRef = useRef<HTMLElement>(null)

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

  // A11y: AnimatePresence mode="wait" tears the old screen out and mounts the new
  // one AFTER exit, which silently drops keyboard focus. On every phase swap we
  // move focus to the new screen's heading ([data-phase-heading], tabIndex=-1) so
  // keyboard + screen-reader users land at the top of the new content. Fired from
  // onExitComplete (so it never steals focus on the initial mount) and retried
  // across a few frames because the new node commits just after that callback.
  const focusPhaseHeading = useCallback(() => {
    let tries = 0
    const attempt = () => {
      const heading = mainRef.current?.querySelector<HTMLElement>('[data-phase-heading]')
      if (heading) heading.focus()
      else if (tries++ < 3) requestAnimationFrame(attempt)
    }
    requestAnimationFrame(attempt)
  }, [])

  const handleRun = useCallback(() => {
    const result = run(state.inputs)
    if (!result) return // engine not ready yet
    // deriveSignal is the frozen engine's PURE read of what this run produced —
    // recomposed with the same inputFilter the session applied, so THE WIRE can
    // switch its render (rows / oracle / timing / error / side-effect) per level.
    const composed = compose(level.query.template, state.inputs, level.query.inputFilter)
    const signal = deriveSignal(level, composed, result)
    const evaluation = evaluate(level.winCondition, toWinContext(result, state.inputs))
    dispatch({ type: 'RUN', result, evaluation, signal })

    if (evaluation.won) {
      push('success', 'Loot secured — moving to the score.')
    } else if (result.filter?.mode === 'reject') {
      push('error', `Blocked by the filter: ${result.filter.blocked.join(', ') || 'your payload'}.`)
    } else if (result.error) {
      push('error', 'The mark choked on that — read what it spat back.')
    } else {
      push('info', evaluation.reason)
    }
  }, [run, state.inputs, level, push])

  const handleReset = useCallback(() => {
    reset()
    dispatch({ type: 'RESET_ATTEMPT' })
  }, [reset])

  const handleReplay = useCallback(() => {
    reset()
    setReplays((r) => r + 1)
    dispatch({ type: 'RESTART' })
  }, [reset])

  // Session-preserving step back (WS1): phase-only, so the engine LevelSession,
  // the composed DB, inputs, timer and hint spend all survive the detour. NOT a
  // replay — no reset()/openLevel() here (only handleReplay does that).
  const handleBack = useCallback(() => {
    dispatch({ type: 'BACK' })
  }, [])

  const handleNext = useCallback(() => {
    if (nextJobId) router.push(`/jobs/${nextJobId}`)
  }, [nextJobId, router])

  const suggestHint = shouldSuggestHint(state.failedRuns, state.elapsedSec)
  const backTarget = previousPhase(state.phase)

  const transition: Transition = reduce
    ? { duration: 0 }
    : { duration: 0.22, ease: [0.16, 1, 0.3, 1] }

  return (
    <LazyMotion features={domAnimation} strict>
      <div className={styles.shell}>
        <TopBar
          jobTitle={level.job}
          phase={state.phase}
          elapsedSec={state.elapsedSec}
          score={state.score}
          muted={muted}
          onToggleMute={() => setMuted((prev) => !prev)}
          canBack={backTarget != null}
          backLabel={backTarget ? PHASE_LABELS[backTarget] : null}
          onBack={handleBack}
        />

        {/* Persistent, terse live region: announces the stage on every swap. The
            swapping region below is NOT a live region (it would re-read the whole
            screen and nest the SqlPreview/beat live regions — §11 double-speak). */}
        <p className="sr-only" role="status" aria-live="polite">
          {`${PHASE_LABELS[state.phase]} stage`}
        </p>

        <main className={styles.main} ref={mainRef}>
          <AnimatePresence mode="wait" onExitComplete={focusPhaseHeading}>
            <m.div
              key={state.phase}
              role="region"
              aria-label={`${PHASE_LABELS[state.phase]} stage`}
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
                  signal={state.lastSignal}
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

              {state.phase === 'loot' &&
                state.winningInputs &&
                state.score != null &&
                state.stars && (
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
            </m.div>
          </AnimatePresence>
        </main>

        <ToastStack toasts={toasts} onDismiss={dismiss} />
      </div>
    </LazyMotion>
  )
}
