import { parseLevel, type Level } from '@/lib/schema/level'
import frontDoorJson from '@/content/levels/front-door.json'
import vaultJson from '@/content/levels/vault.json'
import blueprintJson from '@/content/levels/blueprint.json'
import theTellJson from '@/content/levels/the-tell.json'
import theStopwatchJson from '@/content/levels/the-stopwatch.json'
import theConfessionJson from '@/content/levels/the-confession.json'
import theDoubleTapJson from '@/content/levels/the-double-tap.json'
import theDoormanJson from '@/content/levels/the-doorman.json'

// Server-safe level registry (no 'use client', no engine/WASM). The 3 REAL levels
// are validated through the FROZEN engine's parseLevel at import — a malformed
// level fails the build (Zod gate, docs/01-architecture.md §4). This is the single
// place the content is loaded; routes read metadata or a full Level from here.

export const LEVELS: Level[] = [
  frontDoorJson,
  vaultJson,
  blueprintJson,
  theTellJson,
  theStopwatchJson,
  theConfessionJson,
  theDoubleTapJson,
  theDoormanJson,
]
  .map(parseLevel)
  .sort((a, b) => a.order - b.order)

export const JOB_IDS = LEVELS.map((l) => l.id)

export interface JobMeta {
  id: string
  order: number
  job: string
  title: string
  technique: string
  difficulty: string
  objective: string
}

// Board metadata only — deliberately omits schemaSql/seedSql so the Job Board
// bundle never ships the level's SQL.
export function getJobMetas(): JobMeta[] {
  return LEVELS.map((l) => ({
    id: l.id,
    order: l.order,
    job: l.job,
    title: l.title,
    technique: l.technique,
    difficulty: l.difficulty,
    objective: l.brief.objective,
  }))
}

export function getLevel(id: string): Level | undefined {
  return LEVELS.find((l) => l.id === id)
}

export function getNextJobId(id: string): string | undefined {
  const level = getLevel(id)
  if (!level) return undefined
  return LEVELS.find((l) => l.order === level.order + 1)?.id
}
