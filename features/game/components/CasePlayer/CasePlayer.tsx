'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  LazyMotion,
  domAnimation,
  m,
  useReducedMotion,
  type Transition,
} from 'framer-motion'
import Link from 'next/link'
import type { Case, Objective } from '@/lib/schema/case'
import type { RunResult } from '@/lib/engine/sqlRunner'
import type { RunSignal } from '@/lib/engine/signal'
import { compose } from '@/lib/engine/queryComposer'
import { deriveSignal } from '@/lib/engine/signal'
import { evaluate, toWinContext } from '@/lib/engine/winEvaluator'
import { canOpenHint, shouldSuggestHint } from '@/lib/engine/scoring'
import { cx } from '@/ui/cx'
import { useTranslation } from '@/i18n/useTranslation'
import { useCaseEngine } from '../../lib/useCaseEngine'
import {
  completedObjectiveIds,
  recordObjectiveWin,
  useCaseProgress,
} from '../../lib/useCaseProgress'
import { useToasts } from '../../lib/useToasts'
import { firstIncompleteIndex, objectiveAsLevel, pullDetail } from '../../lib/caseView'
import { accrueDiscovered, initNotebook, recordPull } from '../../lib/reconNotebook'
import { BriefingGate } from '../BriefingGate'
import { ObjectiveBanner } from '../ObjectiveBanner'
import { ObjectivePayoff } from '../ObjectivePayoff'
import { ObjectivesProgress } from '../ObjectivesProgress'
import { CaseTimer } from '../CaseTimer'
import { ReconNotebook } from '../ReconNotebook'
import { Stamp } from '../Stamp'
import { ToastStack } from '../Toast'
import { IconArrowLeft } from '../icons'
import { ObjectiveConsole } from './ObjectiveConsole'
import { CaseClosed } from './CaseClosed'
import styles from './CasePlayer.module.css'

// The case orchestrator (docs/cases-design.md §UI) — reworked to a GUIDED, step-by-
// step flow (v2). Entering a case no longer dumps brief + plan + objective + recon +
// exploit on one screen; it walks four stages, one focus at a time:
//   briefing → playing → payoff → closed
// A compact objectives stepper rides the TOP (ObjectivesProgress, ex-sidebar) so the
// exploit surface gets the full width. The recon notebook is case-spanning (accrues
// discovered schema across objectives) so it lives here, not in the console. Owns the
// ONE persistent case-session (useCaseEngine → useRef, disposed on unmount) and the
// per-objective loop: run → evaluate (frozen winEvaluator) → on a win commit the
// snapshot (Model A) + persist progress, then show the objective PAYOFF (what was
// pulled + the Fixer's chain line) with a Next button — no silent auto-advance.
// After the last objective's payoff, CaseClosed (final payoff + defense debriefs).
// LazyMotion(domAnimation, strict) keeps only the DOM-animation set in this bundle
// (every animated child uses `m.*`); no `layout` animations are used.

type Stage = 'briefing' | 'playing' | 'payoff' | 'closed'

// Per-objective UI slice (inputs / last run / hints / fails). Kept per objective —
// not global — so switching between objectives preserves each one's surface.
interface ObjectiveUi {
  inputs: Record<string, string>
  run: { result: RunResult; signal: RunSignal } | null
  openedTiers: number
  failedRuns: number
}

function initUi(objectives: Objective[]): Record<string, ObjectiveUi> {
  const map: Record<string, ObjectiveUi> = {}
  for (const objective of objectives) {
    const inputs: Record<string, string> = {}
    for (const field of objective.fields) inputs[field.name] = ''
    map[objective.id] = { inputs, run: null, openedTiers: 0, failedRuns: 0 }
  }
  return map
}

function clearedInputs(inputs: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const key of Object.keys(inputs)) out[key] = ''
  return out
}

export function CasePlayer({ gameCase }: { gameCase: Case }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const objectives = gameCase.objectives
  const { status, run, commit, reset, retry } = useCaseEngine(gameCase)
  const { records, ready } = useCaseProgress()
  const { toasts, push, dismiss } = useToasts()

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [uiByObjective, setUiByObjective] = useState<Record<string, ObjectiveUi>>(() =>
    initUi(objectives),
  )
  // The recon notebook spans the WHOLE case (accrues discovered schema across
  // objectives), so its state lives here — not in the per-objective console — and
  // the data pried loose in one objective stays visible in every later one.
  const [notebook, setNotebook] = useState(() => initNotebook(gameCase.database.visibleSchema))
  // Entering a case opens on the BRIEF alone (the guided gate), never the exploit
  // surface — the fix for "everything dumped at once".
  const [stage, setStage] = useState<Stage>('briefing')
  const [hydrated, setHydrated] = useState(false)
  // Bumped on replay so the case timer zeroes.
  const [replayCount, setReplayCount] = useState(0)
  const mainRef = useRef<HTMLElement>(null)

  // Reconcile persisted progress once localStorage is read (client-only): mark done
  // objectives and point the player at the first unsolved one. Stays on the briefing
  // gate; "Take the case" is what drops them onto that objective. Runs once (guarded)
  // so an in-session win is never clobbered by a re-read.
  useEffect(() => {
    if (!ready || hydrated) return
    const done = completedObjectiveIds(gameCase.id, records)
    setCompletedIds(done)
    setSelectedIndex(Math.min(firstIncompleteIndex(objectives, done), objectives.length - 1))
    setHydrated(true)
  }, [ready, hydrated, records, gameCase.id, objectives])

  const objective = objectives[selectedIndex]
  const ui = uiByObjective[objective.id]
  const suggestHint = shouldSuggestHint(ui.failedRuns, 0)
  const allComplete = firstIncompleteIndex(objectives, completedIds) >= objectives.length

  // A11y: AnimatePresence mode="wait" mounts the new screen AFTER exit, dropping
  // focus. On every stage/objective swap move focus to the new heading
  // ([data-objective-heading], tabIndex -1). Fired from onExitComplete so it never
  // steals focus on the initial mount (mirrors JobPlayer.focusPhaseHeading).
  const focusHeading = useCallback(() => {
    let tries = 0
    const attempt = () => {
      const heading = mainRef.current?.querySelector<HTMLElement>('[data-objective-heading]')
      if (heading) heading.focus()
      else if (tries++ < 3) requestAnimationFrame(attempt)
    }
    requestAnimationFrame(attempt)
  }, [])

  const handleRun = useCallback(() => {
    const index = selectedIndex
    const obj = objectives[index]
    const inputs = uiByObjective[obj.id].inputs
    const result = run(index, inputs)
    if (!result) return // engine not ready yet

    // Recompose WITH the objective's WAF filter (as the session did) so the derived
    // signal matches what actually ran; the live preview stays raw. deriveSignal is
    // Level-typed and reads only winCondition — objectiveAsLevel feeds it a valid,
    // type-safe view of this objective against the shared DB.
    const composed = compose(obj.query.template, inputs, obj.query.inputFilter)
    const signal = deriveSignal(objectiveAsLevel(gameCase, obj), composed, result)
    const evaluation = evaluate(obj.winCondition, toWinContext(result, inputs))

    setUiByObjective((prev) => {
      const cur = prev[obj.id]
      return {
        ...prev,
        [obj.id]: {
          ...cur,
          run: { result, signal },
          failedRuns: evaluation.won ? cur.failedRuns : cur.failedRuns + 1,
        },
      }
    })
    // Fold clean, non-empty result values into the case notebook (a hidden table's
    // CREATE leaked via a UNION, etc.). accrueDiscovered returns the same ref when
    // nothing is new, so React bails the re-render.
    if (!result.error && result.rows.length > 0) {
      setNotebook((nb) => accrueDiscovered(nb, result.rows))
    }

    if (evaluation.won) {
      push('success', t('game.toast.won'))
      if (!completedIds.has(obj.id)) {
        commit(index) // Model A: this run's DB state becomes the next objective's start.
        recordObjectiveWin(gameCase.id, obj.id)
        const next = new Set(completedIds)
        next.add(obj.id)
        setCompletedIds(next)
        // Log what this objective pulled so the notebook carries the loot forward —
        // the "I got this, now I can do the next thing" thread across the case.
        setNotebook((nb) => recordPull(nb, obj.payoff?.got ?? obj.goal, pullDetail(obj, result)))
      }
      // No silent auto-advance: land on the payoff for THIS objective (selectedIndex
      // stays put) — its winning run stays in uiByObjective for the "what we pulled".
      setStage('payoff')
    } else if (result.filter?.mode === 'reject') {
      const terms = result.filter.blocked.join(', ') || t('game.toast.blockedFallback')
      push('error', t('game.toast.blocked', { terms }))
    } else if (result.error) {
      push('error', t('game.toast.choked'))
    } else {
      // MISS: a clean run that just missed the win. Neutral, result-aware note
      // (literal by design — this track adds no message-catalog keys), mirroring
      // JobPlayer: never echo evaluation.reason (authored as the WIN sentence).
      push(
        'info',
        result.rowCount > 0
          ? 'Rows came back, but not the ones you need.'
          : "Nothing came back — that one didn't land.",
      )
    }
  }, [selectedIndex, objectives, uiByObjective, run, gameCase, push, t, commit, completedIds])

  const handleChange = useCallback(
    (field: string, value: string) => {
      const id = objectives[selectedIndex].id
      setUiByObjective((prev) => ({
        ...prev,
        [id]: { ...prev[id], inputs: { ...prev[id].inputs, [field]: value } },
      }))
    },
    [objectives, selectedIndex],
  )

  // Surface reset = clear this objective's inputs + last result. No engine reset:
  // runObjective already restores to the objective's start snapshot every run, so
  // resetting the session would needlessly drop earlier objectives' committed state.
  const handleReset = useCallback(() => {
    const id = objectives[selectedIndex].id
    setUiByObjective((prev) => ({
      ...prev,
      [id]: { ...prev[id], inputs: clearedInputs(prev[id].inputs), run: null },
    }))
  }, [objectives, selectedIndex])

  const handleOpenHint = useCallback(
    (tier: number) => {
      const obj = objectives[selectedIndex]
      setUiByObjective((prev) => {
        const cur = prev[obj.id]
        if (!canOpenHint(cur.openedTiers, tier, obj.hints.length)) return prev
        return { ...prev, [obj.id]: { ...cur, openedTiers: tier } }
      })
    },
    [objectives, selectedIndex],
  )

  // Stepper click: jump to a cleared/active objective and put it in focus.
  const handleSelect = useCallback((index: number) => {
    setSelectedIndex(index)
    setStage('playing')
  }, [])

  // "Take the case" on the briefing gate → the first unsolved objective (or straight
  // to the closed payoff if the player already cleared everything).
  const handleStart = useCallback(() => {
    const active = firstIncompleteIndex(objectives, completedIds)
    if (active >= objectives.length) {
      setStage('closed')
      return
    }
    setSelectedIndex(active)
    setStage('playing')
  }, [objectives, completedIds])

  // "Next" on a payoff → the next unsolved objective, or the case-closed screen once
  // every objective is cleared.
  const handleNext = useCallback(() => {
    const active = firstIncompleteIndex(objectives, completedIds)
    if (active >= objectives.length) {
      setStage('closed')
      return
    }
    setSelectedIndex(active)
    setStage('playing')
  }, [objectives, completedIds])

  const transition: Transition = reduce
    ? { duration: 0 }
    : { duration: 0.22, ease: [0.16, 1, 0.3, 1] }

  const viewKey =
    stage === 'briefing'
      ? 'briefing'
      : stage === 'closed'
        ? 'closed'
        : stage === 'payoff'
          ? `payoff:${objective.id}`
          : `obj:${objective.id}`

  const announce =
    stage === 'briefing'
      ? `Case briefing: ${gameCase.title}`
      : stage === 'closed'
        ? 'Case closed'
        : stage === 'payoff'
          ? `Objective ${selectedIndex + 1} cleared${objective.payoff ? `: ${objective.payoff.got}` : ''}`
          : `Objective ${selectedIndex + 1} of ${objectives.length}: ${objective.goal}`

  // Replay: rebuild the case DB from schema+seed, wipe the in-session play state, and
  // drop the player back on objective 1. Persisted mastery (localStorage) is kept —
  // replaying is practice, not a progress reset.
  const handleReplay = useCallback(() => {
    reset()
    setCompletedIds(new Set())
    setSelectedIndex(0)
    setUiByObjective(initUi(objectives))
    setNotebook(initNotebook(gameCase.database.visibleSchema))
    setReplayCount((n) => n + 1)
    setStage('playing')
  }, [reset, objectives, gameCase.database.visibleSchema])

  const showStepper = stage === 'playing' || stage === 'payoff'

  return (
    <LazyMotion features={domAnimation} strict>
      <div className={styles.shell}>
        <div className={cx('container', styles.inner)}>
          <header className={styles.caseHeader}>
            <div className={styles.caseHeaderMain}>
              <Stamp>Case {gameCase.number}</Stamp>
              <h1 className={styles.caseTitle}>{gameCase.title}</h1>
              <p className={styles.caseTarget}>
                Target: <span className="mono">{gameCase.target.appName}</span>
              </p>
            </div>
            <div className={styles.caseHeaderAside}>
              {stage !== 'briefing' && (
                <CaseTimer
                  running={stage === 'playing' || stage === 'payoff'}
                  resetKey={replayCount}
                />
              )}
              <Link href="/cases" className={styles.backLink}>
                <IconArrowLeft size={16} />
                <span>The board</span>
              </Link>
            </div>
          </header>

          {showStepper && (
            <ObjectivesProgress
              objectives={objectives}
              completed={completedIds}
              selectedIndex={selectedIndex}
              onSelect={handleSelect}
            />
          )}

          <main className={styles.main} ref={mainRef}>
            {/* Persistent, terse live region: announces the objective/stage on every
                swap (the swapping region below is NOT a live region — it would re-read
                the whole screen and nest child live regions). */}
            <p className="sr-only" role="status" aria-live="polite">
              {announce}
            </p>

            <AnimatePresence mode="wait" onExitComplete={focusHeading}>
              <m.div
                key={viewKey}
                role="region"
                aria-label={announce}
                initial={{ opacity: 0, x: reduce ? 0 : -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: reduce ? 0 : 6 }}
                transition={transition}
                className={styles.view}
              >
                {stage === 'briefing' ? (
                  <BriefingGate
                    briefing={gameCase.briefing}
                    objectiveCount={objectives.length}
                    onStart={handleStart}
                  />
                ) : stage === 'closed' ? (
                  <CaseClosed gameCase={gameCase} onReplay={handleReplay} />
                ) : stage === 'payoff' ? (
                  <ObjectivePayoff
                    index={selectedIndex}
                    total={objectives.length}
                    objective={objective}
                    result={ui.run?.result ?? null}
                    signal={ui.run?.signal ?? null}
                    handler={gameCase.briefing.handler}
                    isLast={allComplete}
                    onNext={handleNext}
                  />
                ) : (
                  <>
                    <ObjectiveBanner
                      index={selectedIndex}
                      total={objectives.length}
                      goal={objective.goal}
                      why={objective.why}
                      doneWhen={objective.doneWhen}
                      approach={objective.approach}
                      technique={objective.technique}
                    />

                    <ReconNotebook notebook={notebook} />

                    <ObjectiveConsole
                      appName={gameCase.target.appName}
                      objective={objective}
                      visibleSchema={gameCase.database.visibleSchema}
                      inputs={ui.inputs}
                      lastResult={ui.run?.result ?? null}
                      signal={ui.run?.signal ?? null}
                      engineStatus={status}
                      openedTiers={ui.openedTiers}
                      suggestHint={suggestHint}
                      onChange={handleChange}
                      onRun={handleRun}
                      onReset={handleReset}
                      onRetry={retry}
                      onOpenHint={handleOpenHint}
                    />
                  </>
                )}
              </m.div>
            </AnimatePresence>
          </main>
        </div>

        <ToastStack toasts={toasts} onDismiss={dismiss} />
      </div>
    </LazyMotion>
  )
}
