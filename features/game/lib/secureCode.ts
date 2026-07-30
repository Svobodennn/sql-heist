import type { CodeSnippet, SecureSnippet as EngineSecureSnippet } from '@/lib/schema/level'
import { normalizeSecureCode } from '@/lib/schema/level'

// UI tab model for the Debrief "fix" beat (docs/04-frontend-ux.md §7.2). Adapts
// the engine's canonical SecureSnippet ({ id, label, language, code }) — the
// single source of truth — into the { stack, snippet } shape CodeCompare renders
// as tabs. The UI never re-implements the schema contract; it delegates to the
// engine's normalizeSecureCode and maps `label` onto the tab title.

export interface SecureSnippet {
  stack: string // tab label, e.g. "Node.js (pg / mysql2)" or "Secure" (legacy)
  snippet: CodeSnippet // { language, code }
}

interface DebriefSecure {
  secureCode: CodeSnippet
  secureCodeVariants?: EngineSecureSnippet[]
}

// Fold a level's secure fix into UI tabs: prefer the per-stack variants, else the
// single legacy snippet. `secureCodeVariants` is schema-guaranteed non-empty when
// present (Zod .min(1)), so the debrief can never render zero tabs.
export function selectSecureSnippets(debrief: DebriefSecure): SecureSnippet[] {
  const tabs = normalizeSecureCode(debrief.secureCodeVariants ?? debrief.secureCode)
  return tabs.map((t) => ({ stack: t.label, snippet: { language: t.language, code: t.code } }))
}

// Roving-tabindex keyboard model for the secure tablist. Pure, so it unit-tests
// in the node vitest suite. Non-navigation keys return `current` unchanged.
export function nextTabIndex(current: number, key: string, count: number): number {
  if (count <= 0) return 0
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (current + 1) % count
    case 'ArrowLeft':
    case 'ArrowUp':
      return (current - 1 + count) % count
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return current
  }
}
