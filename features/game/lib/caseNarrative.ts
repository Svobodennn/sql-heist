import type { Case } from '@/lib/schema/case'

// Per-locale case NARRATIVE overlay. The base case JSON (content/cases/*.json) is the
// single source of the game mechanics — SQL (query/winCondition/expectedSolution) and
// the debrief code samples stay there in English and are NEVER duplicated per locale.
// A locale overlay carries only the human-readable narrative the player reads, keyed
// by case id → objective id, and is merged over the base at load time. Any missing
// field falls back to the base (English), so a partial overlay degrades gracefully.

export interface ObjectiveNarrative {
  goal?: string
  why?: string
  doneWhen?: string
  approach?: string
  hints?: Record<string, string> // hint id → text
  payoff?: { got?: string; fixer?: string }
  debrief?: { explanation?: string; takeaway?: string }
  fields?: Record<string, { label?: string; placeholder?: string }> // field name → labels
}

export interface CaseNarrative {
  title?: string
  briefing?: string // briefing.text (the handler name stays in the base)
  caseClosed?: { headline?: string; fixer?: string }
  objectives?: Record<string, ObjectiveNarrative> // objective id → narrative
}

export type CaseNarrativeMap = Record<string, CaseNarrative> // case id → narrative

// Merge a narrative overlay over a base case, returning a NEW Case (base untouched).
// Only narrative strings are replaced; mechanics (schema/seed SQL, query, winCondition,
// expectedSolution, debrief code blocks) are copied verbatim from the base.
export function applyCaseNarrative(base: Case, n?: CaseNarrative): Case {
  if (!n) return base
  const c: Case = JSON.parse(JSON.stringify(base))

  if (n.title) c.title = n.title
  if (n.briefing) c.briefing.text = n.briefing
  if (n.caseClosed?.headline) c.caseClosed.headline = n.caseClosed.headline
  if (n.caseClosed?.fixer) c.caseClosed.fixer = n.caseClosed.fixer

  for (const obj of c.objectives) {
    const on = n.objectives?.[obj.id]
    if (!on) continue
    if (on.goal) obj.goal = on.goal
    if (on.why) obj.why = on.why
    if (on.doneWhen) obj.doneWhen = on.doneWhen
    if (on.approach) obj.approach = on.approach
    if (on.hints) {
      for (const h of obj.hints) {
        const text = on.hints[h.id]
        if (text) h.text = text
      }
    }
    if (on.payoff && obj.payoff) {
      if (on.payoff.got) obj.payoff.got = on.payoff.got
      if (on.payoff.fixer) obj.payoff.fixer = on.payoff.fixer
    }
    if (on.debrief) {
      if (on.debrief.explanation) obj.debrief.explanation = on.debrief.explanation
      if (on.debrief.takeaway) obj.debrief.takeaway = on.debrief.takeaway
    }
    if (on.fields) {
      for (const f of obj.fields) {
        const fn = on.fields[f.name]
        if (!fn) continue
        if (fn.label) f.label = fn.label
        if (fn.placeholder) f.placeholder = fn.placeholder
      }
    }
  }
  return c
}
