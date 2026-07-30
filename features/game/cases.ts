import { parseCase, type Case } from '@/lib/schema/case'
import type { TechniqueId } from '@/lib/schema/level'
import frontDoorCase from '@/content/cases/the-front-door.json'
import quietRoomCase from '@/content/cases/the-quiet-room.json'
import vaultCase from '@/content/cases/the-vault.json'

// Server-safe case registry (no 'use client', no engine/WASM). Each case JSON is
// validated through parseCase at import — a malformed case fails the build. This is
// the single place case content is loaded; routes read metadata or a full Case here.
export const CASES: Case[] = [frontDoorCase, quietRoomCase, vaultCase]
  .map(parseCase)
  .sort((a, b) => a.number.localeCompare(b.number))

export const CASE_IDS = CASES.map((c) => c.id)

export interface CaseObjectiveMeta {
  id: string
  technique: TechniqueId
}

export interface CaseMeta {
  id: string
  number: string
  title: string
  appName: string
  objectiveCount: number
  // Per-objective id + technique (ordered) — drives the board's technique chips and
  // the mastery badge strip. Ids are not SQL, so the board bundle stays SQL-free.
  objectives: CaseObjectiveMeta[]
}

// Board metadata only — omits schemaSql/seedSql so the Case Board bundle never
// ships the cases' SQL.
export function getCaseMetas(): CaseMeta[] {
  return CASES.map((c) => ({
    id: c.id,
    number: c.number,
    title: c.title,
    appName: c.target.appName,
    objectiveCount: c.objectives.length,
    objectives: c.objectives.map((o) => ({ id: o.id, technique: o.technique })),
  }))
}

export function getCase(id: string): Case | undefined {
  return CASES.find((c) => c.id === id)
}
