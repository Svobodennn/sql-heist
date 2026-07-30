import type { JobMeta } from '../levels'

// Job Board Act grouping (docs/ws3-design.md: "Board shows Act I / Act II").
// Act I = the 3 MVP jobs (order <= 3), Act II = the advanced jobs (order >= 4).
// Pure so it unit-tests in the node suite; the board renders a headed section per
// returned group. Only NON-EMPTY acts are returned, so with just the 3 MVP levels
// in this worktree the board shows Act I alone and gains Act II once the parent
// merges the advanced levels — no empty header, graceful either way.

export type ActNumber = 1 | 2

export interface ActSection {
  act: ActNumber
  title: string
  tagline: string
  jobs: JobMeta[]
}

const ACT_I_MAX_ORDER = 3

export function actOf(order: number): ActNumber {
  return order <= ACT_I_MAX_ORDER ? 1 : 2
}

const ACT_META: Record<ActNumber, { title: string; tagline: string }> = {
  1: { title: 'Act I — The Basics', tagline: 'Three doors. Learn the trade.' },
  2: { title: 'Act II — Advanced Work', tagline: 'The Fixer hands out the hard jobs.' },
}

export function groupByAct(jobs: JobMeta[]): ActSection[] {
  const buckets: Record<ActNumber, JobMeta[]> = { 1: [], 2: [] }
  // Preserve incoming order within each act (the board pre-sorts by `order`).
  for (const job of jobs) buckets[actOf(job.order)].push(job)

  const sections: ActSection[] = []
  for (const act of [1, 2] as ActNumber[]) {
    if (buckets[act].length === 0) continue
    sections.push({ act, ...ACT_META[act], jobs: buckets[act] })
  }
  return sections
}
