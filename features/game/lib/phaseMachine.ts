import type { Level } from '@/lib/schema/level'
import type { ExecutionResult } from '@/lib/engine/sqlRunner'
import type { WinEvaluation } from '@/lib/engine/winEvaluator'
import { canOpenHint, computeJobScore, starsForScore } from '@/lib/engine/scoring'

// Job-scoped phase state machine (docs/01-architecture.md §7.1). Pure reducer —
// no React, no engine/WASM — so it unit-tests in the node vitest suite. The
// engine LevelSession lives imperatively in a useRef inside <JobPlayer>; this
// reducer only tracks player-facing state and the win transition.
//
//   brief <-> recon <-> exploit  (won) -> loot -> debrief
//                         ^__________ reset attempt ___________|
//
// BACK walks exploit -> recon -> brief WITHOUT touching the engine session (no
// reset()/openLevel()), so the DB, inputs, timer and hint spend all survive a
// detour — only an explicit RESTART ("run it back") wipes the slate.

export type Phase = 'brief' | 'recon' | 'exploit' | 'loot' | 'debrief'

export const PHASE_LABELS: Record<Phase, string> = {
  brief: 'Brief',
  recon: 'Recon',
  exploit: 'Exploit',
  loot: 'Loot',
  debrief: 'Debrief',
}

export interface GameState {
  phase: Phase
  inputs: Record<string, string>
  lastResult: ExecutionResult | null
  failedRuns: number
  openedHintTiers: number
  elapsedSec: number
  score: number | null
  stars: 1 | 2 | 3 | null
  winningInputs: Record<string, string> | null
  hintCount: number
}

export type GameAction =
  | { type: 'ADVANCE' } // brief -> recon -> exploit (linear forward)
  | { type: 'BACK' } // exploit -> recon -> brief (session-preserving)
  | { type: 'SET_INPUT'; field: string; value: string }
  | { type: 'RUN'; result: ExecutionResult; evaluation: WinEvaluation }
  | { type: 'RESET_ATTEMPT' }
  | { type: 'RESTART' } // "run it back" — replay the job to improve the score
  | { type: 'OPEN_HINT'; tier: number }
  | { type: 'TICK' }
  | { type: 'GOTO'; phase: Phase }

export function makeInitialState(level: Level): GameState {
  const inputs: Record<string, string> = {}
  for (const field of level.target.fields) inputs[field.name] = ''
  return {
    phase: 'brief',
    inputs,
    lastResult: null,
    failedRuns: 0,
    openedHintTiers: 0,
    elapsedSec: 0,
    score: null,
    stars: null,
    winningInputs: null,
    hintCount: level.hints.length,
  }
}

const NEXT_PHASE: Partial<Record<Phase, Phase>> = {
  brief: 'recon',
  recon: 'exploit',
}

// Backwards edges mirror the forward path — only the pre-win exploration phases
// are revisitable (loot/debrief are post-win terminals).
const PREV_PHASE: Partial<Record<Phase, Phase>> = {
  recon: 'brief',
  exploit: 'recon',
}

export function previousPhase(phase: Phase): Phase | null {
  return PREV_PHASE[phase] ?? null
}

export function canGoBack(phase: Phase): boolean {
  return PREV_PHASE[phase] != null
}

function emptyInputs(inputs: Record<string, string>): Record<string, string> {
  const cleared: Record<string, string> = {}
  for (const key of Object.keys(inputs)) cleared[key] = ''
  return cleared
}

export function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'ADVANCE': {
      const next = NEXT_PHASE[state.phase]
      return next ? { ...state, phase: next } : state
    }

    case 'BACK': {
      // Phase-only change: no engine call, no counter reset. Revisiting Recon
      // from Exploit and returning leaves every attempt/hint/second intact.
      const prev = PREV_PHASE[state.phase]
      return prev ? { ...state, phase: prev } : state
    }

    case 'SET_INPUT': {
      if (state.phase !== 'exploit') return state
      return { ...state, inputs: { ...state.inputs, [action.field]: action.value } }
    }

    case 'RUN': {
      const base = { ...state, lastResult: action.result }
      if (!action.evaluation.won) {
        return { ...base, failedRuns: state.failedRuns + 1 }
      }
      // Win: freeze the winning inputs and compute the transparent score once.
      const score = computeJobScore({
        failedRuns: state.failedRuns,
        openedHintTiers: state.openedHintTiers,
        actualTimeSec: state.elapsedSec,
      })
      return {
        ...base,
        phase: 'loot',
        score,
        stars: starsForScore(score),
        winningInputs: { ...state.inputs },
      }
    }

    case 'RESET_ATTEMPT': {
      // DB reset is the session's job; here we only clear the surface. Cumulative
      // counters (attempts, hints, time) survive — they drive the eventual score.
      return { ...state, inputs: emptyInputs(state.inputs), lastResult: null }
    }

    case 'RESTART': {
      // Full replay: drop straight into exploit (brief/recon already seen) with a
      // clean slate — every counter reset so a better score is possible.
      return {
        ...state,
        phase: 'exploit',
        inputs: emptyInputs(state.inputs),
        lastResult: null,
        failedRuns: 0,
        openedHintTiers: 0,
        elapsedSec: 0,
        score: null,
        stars: null,
        winningInputs: null,
      }
    }

    case 'OPEN_HINT': {
      if (!canOpenHint(state.openedHintTiers, action.tier, state.hintCount)) return state
      return { ...state, openedHintTiers: action.tier }
    }

    case 'TICK': {
      if (state.phase !== 'exploit') return state
      return { ...state, elapsedSec: state.elapsedSec + 1 }
    }

    case 'GOTO':
      return { ...state, phase: action.phase }
  }
}
