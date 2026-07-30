import type { Case, Objective } from '@/lib/schema/case'
import type { Level, TechniqueId } from '@/lib/schema/level'
import type { RunResult } from '@/lib/engine/sqlRunner'
import { BADGE_TECHNIQUES } from './badges'

// Pure case/objective view helpers (no React) — the case twin of the small
// mappers the jobs flow reads off a Level. Kept in features/game/lib so they
// unit-test in the node suite and the components stay render-only (SRP).

// Re-lower a case's shared DB + target onto ONE objective to reconstruct the
// Level VIEW that objective represents. The Objective schema documents itself as
// "essentially a Level with the database hoisted up to the Case + the clarity
// fields"; this is the documented inverse. Its ONLY consumer is the FROZEN,
// Level-typed `deriveSignal`, which reads just `winCondition` — building a
// complete, valid Level keeps that call type-safe without touching the engine or
// casting. Cheap + pure; memoize per objective at the call site.
export function objectiveAsLevel(gameCase: Case, objective: Objective): Level {
  return {
    schemaVersion: 1,
    id: `${gameCase.id}:${objective.id}`,
    order: objective.order,
    job: gameCase.title,
    title: objective.goal,
    technique: objective.technique,
    difficulty: objective.difficulty,
    brief: {
      handler: gameCase.briefing.handler,
      text: gameCase.briefing.text,
      objective: objective.goal,
    },
    debrief: objective.debrief,
    target: {
      appName: gameCase.target.appName,
      surface: objective.surface,
      fields: objective.fields,
    },
    database: gameCase.database,
    query: objective.query,
    winCondition: objective.winCondition,
    hints: objective.hints,
    expectedSolution: objective.expectedSolution,
  }
}

// Title-cased technique label ("auth-bypass" -> "Auth Bypass"), reusing the
// canonical roster in badges.ts so the case UI and the mastery badges never drift.
const TECHNIQUE_LABEL = new Map<TechniqueId, string>(
  BADGE_TECHNIQUES.map((b) => [b.id, b.label]),
)
// The notebook line an objective records on a win — a short, technique-aware note
// of what it pulled (the loot flag, the oracle answer, the write that landed).
export function pullDetail(objective: Objective, result: RunResult): string {
  const win = objective.winCondition
  switch (win.type) {
    case 'flag-in-result':
      return win.flag
    case 'row-match':
      return 'target row surfaced'
    case 'blind-boolean':
    case 'blind-timing':
      return 'confirmed by the oracle'
    case 'error-based':
      return 'leaked through the error'
    case 'stacked-queries':
      return 'the stacked write landed'
    case 'rows-returned':
      return `${result.rowCount} row${result.rowCount === 1 ? '' : 's'} pulled`
  }
}

export function techniqueLabel(id: TechniqueId): string {
  return TECHNIQUE_LABEL.get(id) ?? id
}

// The objective the player must tackle now = the first one not yet cleared.
// Equals objectives.length when every objective is done (the case is complete).
export function firstIncompleteIndex(
  objectives: readonly { id: string }[],
  completed: ReadonlySet<string>,
): number {
  const idx = objectives.findIndex((o) => !completed.has(o.id))
  return idx === -1 ? objectives.length : idx
}
