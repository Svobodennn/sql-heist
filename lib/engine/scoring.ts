// Pure scoring + hint-gating helpers (locked-contract §F/§G, game-design §6/§7).
// Positive framing: efficiency is rewarded, experimentation is not punished, and
// completion always beats quitting. All functions are pure and side-effect free;
// the level JSON may override params (e.g. parTimeSec) but defaults are global.

export interface JobScoringParams {
  base: number
  freeAttempts: number
  attemptPenalty: number // A: penalty per failed run beyond freeAttempts
  hintCosts: readonly number[] // cost per tier, opened in order
  parTimeSec: number
  timeBonusRate: number // TB: bonus points per second under par
  timeBonusCap: number
  minScore: number // guaranteed floor on completion
}

export const DEFAULT_SCORING: JobScoringParams = {
  base: 1000,
  freeAttempts: 3,
  attemptPenalty: 50,
  hintCosts: [50, 150, 300],
  parTimeSec: 180,
  timeBonusRate: 2,
  timeBonusCap: 200,
  minScore: 100,
}

const SOFT_HINT_ATTEMPT_THRESHOLD = 5

export interface JobProgress {
  failedRuns: number
  openedHintTiers: number // count of hint tiers unlocked (0..hintCosts.length)
  actualTimeSec: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

// Cumulative cost of the first `openedHintTiers` tiers (clamped to what exists).
export function hintPenalty(
  openedHintTiers: number,
  hintCosts: readonly number[] = DEFAULT_SCORING.hintCosts,
): number {
  const tiers = clamp(openedHintTiers, 0, hintCosts.length)
  let total = 0
  for (let i = 0; i < tiers; i++) total += hintCosts[i]
  return total
}

export function computeJobScore(
  progress: JobProgress,
  params: JobScoringParams = DEFAULT_SCORING,
): number {
  const attemptPenalty =
    params.attemptPenalty * Math.max(0, progress.failedRuns - params.freeAttempts)
  const hintCost = hintPenalty(progress.openedHintTiers, params.hintCosts)
  // Overtime yields 0 bonus, never a penalty — learners are not punished for time.
  const timeBonus = Math.min(
    params.timeBonusCap,
    Math.max(0, params.timeBonusRate * (params.parTimeSec - progress.actualTimeSec)),
  )

  return clamp(
    params.base - attemptPenalty - hintCost + timeBonus,
    params.minScore,
    params.base + params.timeBonusCap,
  )
}

export function starsForScore(score: number): 1 | 2 | 3 {
  if (score >= 900) return 3
  if (score >= 600) return 2
  return 1
}

// Progressive disclosure: a tier can only open if it is exactly the next one.
export function canOpenHint(
  openedHintTiers: number,
  requestedTier: number,
  totalTiers = DEFAULT_SCORING.hintCosts.length,
): boolean {
  return (
    requestedTier >= 1 && requestedTier <= totalTiers && requestedTier === openedHintTiers + 1
  )
}

// Soft trigger only — the UI may gently suggest a hint, but never auto-opens.
export function shouldSuggestHint(
  failedRuns: number,
  elapsedSec: number,
  params: JobScoringParams = DEFAULT_SCORING,
  softAttemptThreshold: number = SOFT_HINT_ATTEMPT_THRESHOLD,
): boolean {
  return failedRuns >= softAttemptThreshold || elapsedSec >= params.parTimeSec
}
