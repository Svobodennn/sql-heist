import type { TechniqueId } from '@/lib/schema/level'

// Per-technique mastery badges (docs/ws3-design.md "UI scope"): the 8 techniques
// that have a job across Act I + Act II. A badge lights up once the player has
// CLEARED a level teaching that technique. Pure so it unit-tests in the node suite
// and works with whatever levels are registered — with only the 3 MVP levels in
// the build, the 5 Act II slots simply render locked until the parent wires them.

export interface TechniqueBadge {
  id: TechniqueId
  label: string
  act: 1 | 2
}

// The canonical roster — deliberately a constant, NOT derived from the registry,
// so all 8 slots render even before Act II levels exist in this worktree.
export const BADGE_TECHNIQUES: readonly TechniqueBadge[] = [
  { id: 'auth-bypass', label: 'Auth Bypass', act: 1 },
  { id: 'union-extraction', label: 'Union Extraction', act: 1 },
  { id: 'schema-discovery', label: 'Schema Discovery', act: 1 },
  { id: 'error-based', label: 'Error-Based', act: 2 },
  { id: 'blind-boolean', label: 'Blind Boolean', act: 2 },
  { id: 'blind-timing', label: 'Blind Timing', act: 2 },
  { id: 'stacked-queries', label: 'Stacked Queries', act: 2 },
  { id: 'waf-bypass', label: 'WAF Bypass', act: 2 },
]

export interface BadgeState extends TechniqueBadge {
  earned: boolean
}

// Board metadata carries a job's technique; progress carries which job ids are
// completed. A technique is mastered when at least one CLEARED job teaches it.
interface JobTechniqueMeta {
  id: string
  technique: string
}

export function earnedTechniques(
  metas: JobTechniqueMeta[],
  completedIds: ReadonlySet<string>,
): Set<string> {
  const earned = new Set<string>()
  for (const meta of metas) {
    if (completedIds.has(meta.id)) earned.add(meta.technique)
  }
  return earned
}

export function computeBadges(
  metas: JobTechniqueMeta[],
  completedIds: ReadonlySet<string>,
): BadgeState[] {
  const earned = earnedTechniques(metas, completedIds)
  return BADGE_TECHNIQUES.map((b) => ({ ...b, earned: earned.has(b.id) }))
}

export function badgeSummary(badges: BadgeState[]): { earned: number; total: number } {
  return { earned: badges.filter((b) => b.earned).length, total: badges.length }
}
