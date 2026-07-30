import { describe, expect, it } from 'vitest'
import { BADGE_TECHNIQUES, badgeSummary, computeBadges, earnedTechniques } from '@/features/game/lib/badges'

// Mirrors getJobMetas() shape (id + technique) without importing the real Act II
// levels (parallel track, not in this worktree).
const metas = [
  { id: 'front-door', technique: 'auth-bypass' },
  { id: 'vault', technique: 'union-extraction' },
  { id: 'blueprint', technique: 'schema-discovery' },
  { id: 'the-tell', technique: 'blind-boolean' },
]

describe('BADGE_TECHNIQUES roster', () => {
  it('covers exactly the 8 job techniques, 3 in Act I and 5 in Act II', () => {
    expect(BADGE_TECHNIQUES).toHaveLength(8)
    expect(BADGE_TECHNIQUES.filter((b) => b.act === 1)).toHaveLength(3)
    expect(BADGE_TECHNIQUES.filter((b) => b.act === 2)).toHaveLength(5)
  })
})

describe('earnedTechniques', () => {
  it('collects the technique of every CLEARED job', () => {
    const earned = earnedTechniques(metas, new Set(['front-door', 'the-tell']))
    expect([...earned].sort()).toEqual(['auth-bypass', 'blind-boolean'])
  })

  it('ignores completed ids with no matching meta', () => {
    expect(earnedTechniques(metas, new Set(['ghost-job'])).size).toBe(0)
  })
})

describe('computeBadges', () => {
  it('marks a badge earned only when its technique was cleared, over all 8 slots', () => {
    const badges = computeBadges(metas, new Set(['vault']))
    expect(badges).toHaveLength(8)
    expect(badges.find((b) => b.id === 'union-extraction')?.earned).toBe(true)
    expect(badges.find((b) => b.id === 'auth-bypass')?.earned).toBe(false)
    // A technique with no registered/cleared job stays locked.
    expect(badges.find((b) => b.id === 'waf-bypass')?.earned).toBe(false)
  })

  it('renders all 8 locked when nothing is completed (degrades with 0 progress)', () => {
    const badges = computeBadges(metas, new Set())
    expect(badges.every((b) => !b.earned)).toBe(true)
  })
})

describe('badgeSummary', () => {
  it('counts earned over total', () => {
    const badges = computeBadges(metas, new Set(['front-door', 'blueprint']))
    expect(badgeSummary(badges)).toEqual({ earned: 2, total: 8 })
  })
})
