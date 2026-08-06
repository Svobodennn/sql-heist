import { parseCase, type Case } from '@/lib/schema/case'
import type { TechniqueId } from '@/lib/schema/level'
import type { Locale } from '@/i18n/config'
import { applyCaseNarrative, type CaseNarrativeMap } from './lib/caseNarrative'
import frontDoorCase from '@/content/cases/the-front-door.json'
import quietRoomCase from '@/content/cases/the-quiet-room.json'
import vaultCase from '@/content/cases/the-vault.json'
import trNarrative from '@/content/cases/i18n/tr.json'
import plNarrative from '@/content/cases/i18n/pl.json'

// Server-safe case registry (no 'use client', no engine/WASM). Each case JSON is
// validated through parseCase at import — a malformed case fails the build. This is
// the single place case content is loaded; routes read metadata or a full Case here.
// Case MECHANICS live in the base JSON (English); per-locale NARRATIVE overlays
// (content/cases/i18n/<locale>.json) are merged in for tr/pl, en reads the base.
export const CASES: Case[] = [frontDoorCase, quietRoomCase, vaultCase]
  .map(parseCase)
  .sort((a, b) => a.number.localeCompare(b.number))

export const CASE_IDS = CASES.map((c) => c.id)

const NARRATIVE: Record<'tr' | 'pl', CaseNarrativeMap> = {
  tr: trNarrative as CaseNarrativeMap,
  pl: plNarrative as CaseNarrativeMap,
}
function narrativeFor(locale: Locale): CaseNarrativeMap | null {
  return locale === 'en' ? null : NARRATIVE[locale]
}

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
// ships the cases' SQL. `title` is localized from the overlay; the rest is locale-agnostic.
export function getCaseMetas(locale: Locale = 'en'): CaseMeta[] {
  const nar = narrativeFor(locale)
  return CASES.map((c) => ({
    id: c.id,
    number: c.number,
    title: nar?.[c.id]?.title ?? c.title,
    appName: c.target.appName,
    objectiveCount: c.objectives.length,
    objectives: c.objectives.map((o) => ({ id: o.id, technique: o.technique })),
  }))
}

export function getCase(id: string, locale: Locale = 'en'): Case | undefined {
  const base = CASES.find((c) => c.id === id)
  if (!base) return undefined
  const nar = narrativeFor(locale)
  return nar ? applyCaseNarrative(base, nar[id]) : base
}
