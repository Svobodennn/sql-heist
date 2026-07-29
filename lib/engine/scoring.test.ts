import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SCORING,
  STAR_THRESHOLDS,
  canOpenHint,
  computeJobScore,
  hintPenalty,
  shouldSuggestHint,
  starsForScore,
} from '@/lib/engine/scoring'

describe('computeJobScore (locked-contract §F / game-design §6.2)', () => {
  it('caps at base + timeBonusCap for a flawless fast solve', () => {
    const score = computeJobScore({ failedRuns: 0, openedHintTiers: 0, actualTimeSec: 0 })
    expect(score).toBe(DEFAULT_SCORING.base + DEFAULT_SCORING.timeBonusCap) // 1200
  })

  it('applies no attempt penalty within freeAttempts', () => {
    const score = computeJobScore({ failedRuns: 3, openedHintTiers: 0, actualTimeSec: 180 })
    expect(score).toBe(1000) // base, par-time -> no bonus, no penalty
  })

  it('penalizes failed runs beyond freeAttempts', () => {
    // 5 fails -> 2 over free -> 2 * 50 = 100 penalty
    const score = computeJobScore({ failedRuns: 5, openedHintTiers: 0, actualTimeSec: 180 })
    expect(score).toBe(900)
  })

  it('subtracts cumulative hint costs', () => {
    // two tiers opened -> 50 + 150 = 200
    const score = computeJobScore({ failedRuns: 0, openedHintTiers: 2, actualTimeSec: 180 })
    expect(score).toBe(800)
  })

  it('never awards a negative time bonus for overtime (no penalty)', () => {
    const overtime = computeJobScore({ failedRuns: 0, openedHintTiers: 0, actualTimeSec: 600 })
    expect(overtime).toBe(1000)
  })

  it('floors at minScore under heavy penalties', () => {
    const score = computeJobScore({ failedRuns: 50, openedHintTiers: 3, actualTimeSec: 999 })
    expect(score).toBe(DEFAULT_SCORING.minScore) // 100
  })
})

describe('starsForScore (game-design §6.3)', () => {
  it('awards 3 stars at >= 900', () => {
    expect(starsForScore(900)).toBe(3)
    expect(starsForScore(1200)).toBe(3)
  })
  it('awards 2 stars in [600, 900)', () => {
    expect(starsForScore(899)).toBe(2)
    expect(starsForScore(600)).toBe(2)
  })
  it('awards 1 star below 600 (completion)', () => {
    expect(starsForScore(599)).toBe(1)
    expect(starsForScore(100)).toBe(1)
  })
  it('reads its cutoffs from STAR_THRESHOLDS (single source of truth)', () => {
    expect(STAR_THRESHOLDS).toEqual({ three: 900, two: 600 })
    expect(starsForScore(STAR_THRESHOLDS.three)).toBe(3)
    expect(starsForScore(STAR_THRESHOLDS.three - 1)).toBe(2)
    expect(starsForScore(STAR_THRESHOLDS.two)).toBe(2)
    expect(starsForScore(STAR_THRESHOLDS.two - 1)).toBe(1)
  })
})

describe('hintPenalty', () => {
  it('sums the opened tiers in order', () => {
    expect(hintPenalty(0)).toBe(0)
    expect(hintPenalty(1)).toBe(50)
    expect(hintPenalty(2)).toBe(200)
    expect(hintPenalty(3)).toBe(500)
  })
  it('clamps a request beyond the available tiers', () => {
    expect(hintPenalty(99)).toBe(500)
  })
})

describe('canOpenHint — sequential gating (game-design §7.1)', () => {
  it('only allows opening the next tier in order', () => {
    expect(canOpenHint(0, 1)).toBe(true)
    expect(canOpenHint(0, 2)).toBe(false) // cannot skip to tier 2
    expect(canOpenHint(1, 2)).toBe(true)
    expect(canOpenHint(2, 3)).toBe(true)
  })
  it('rejects re-opening or out-of-range tiers', () => {
    expect(canOpenHint(2, 1)).toBe(false) // already past
    expect(canOpenHint(3, 4)).toBe(false) // no tier 4
    expect(canOpenHint(0, 0)).toBe(false)
  })
})

describe('shouldSuggestHint — soft trigger only (never auto-opens)', () => {
  it('suggests after the failed-attempt threshold', () => {
    expect(shouldSuggestHint(5, 0)).toBe(true)
    expect(shouldSuggestHint(4, 0)).toBe(false)
  })
  it('suggests once par time is exceeded', () => {
    expect(shouldSuggestHint(0, DEFAULT_SCORING.parTimeSec)).toBe(true)
    expect(shouldSuggestHint(0, 10)).toBe(false)
  })
})
