import type { CodeSnippet } from '@/lib/schema/level'

// WS2 — per-stack secure-code tabs for the Debrief "fix" beat.
//
// The FROZEN level schema ships a single `debrief.secureCode` (CodeSnippet). A
// later content wave adds an OPTIONAL `debrief.secureCodeVariants` array (one
// entry per language/stack). This module is the UI-side normalizer that folds
// EITHER shape into a stable `SecureSnippet[]`, so the merge order of the two
// tracks never matters and a single legacy level keeps working unchanged.
//
// It intentionally mirrors the intended engine `normalizeSecureCode` export;
// when that lands in lib/engine, swap the import here — nothing else changes.

export interface SecureCodeVariant {
  stack: string // display label for the tab, e.g. "Node.js"
  language: string // mono tag on the panel, e.g. "js"
  code: string
}

export interface SecureSnippet {
  stack: string
  snippet: CodeSnippet
}

// Forward-compatible view over the frozen debrief object. `secureCodeVariants`
// is not (yet) in the Zod schema, so it stays optional and is read defensively.
export interface DebriefSecure {
  secureCode: CodeSnippet
  secureCodeVariants?: SecureCodeVariant[]
}

const STACK_LABELS: Record<string, string> = {
  js: 'Node.js',
  javascript: 'Node.js',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  py: 'Python',
  python: 'Python',
  php: 'PHP',
  rb: 'Ruby',
  ruby: 'Ruby',
  go: 'Go',
  golang: 'Go',
  java: 'Java',
  cs: 'C#',
  csharp: 'C#',
  sql: 'SQL',
}

// A friendly stack label for a bare language string (legacy single-snippet case).
export function stackLabel(language: string): string {
  const key = language.trim().toLowerCase()
  return STACK_LABELS[key] ?? (language.trim() || 'Code')
}

// Legacy single `CodeSnippet` OR the per-stack variant array -> `SecureSnippet[]`.
// `null`/`undefined` -> `[]` (the caller decides the fallback). Defensive against
// partially-shaped variants so a malformed entry never crashes the debrief.
export function normalizeSecureCode(
  input: SecureCodeVariant[] | CodeSnippet | null | undefined,
): SecureSnippet[] {
  if (input == null) return []

  if (Array.isArray(input)) {
    return input
      .filter((v): v is SecureCodeVariant => Boolean(v) && typeof v.code === 'string')
      .map((v) => ({
        stack: (typeof v.stack === 'string' && v.stack.trim()) || stackLabel(v.language ?? ''),
        snippet: { language: v.language ?? '', code: v.code },
      }))
  }

  // Single legacy CodeSnippet -> one tab, default-expanded by the UI.
  return [{ stack: stackLabel(input.language), snippet: input }]
}

// The ONE place that reads the (schema-optional) variants field:
// `normalizeSecureCode(secureCodeVariants ?? secureCode)`, hardened so an empty
// variants array still falls back to the single snippet — the debrief can never
// render zero tabs.
export function selectSecureSnippets(debrief: DebriefSecure): SecureSnippet[] {
  const variants = debrief.secureCodeVariants
  const source = variants && variants.length > 0 ? variants : debrief.secureCode
  const tabs = normalizeSecureCode(source)
  return tabs.length > 0 ? tabs : normalizeSecureCode(debrief.secureCode)
}

// Roving-tabindex keyboard model for the secure tablist. Pure, so it unit-tests
// in the node vitest suite (matching phaseMachine/sqlHighlight). Returns the next
// selected index for a key; non-navigation keys return `current` unchanged.
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
