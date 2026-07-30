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

interface DebriefVulnerable {
  vulnerableCode: CodeSnippet
  vulnerableCodeVariants?: EngineSecureSnippet[]
}

// Generic adapter shared by both sides of the debrief: fold either code form — a
// legacy single CodeSnippet or a per-stack SecureSnippet[] — into UI tabs. The
// caller passes the already-picked source (`variants ?? single`). Both variant
// arrays are schema-guaranteed non-empty when present (Zod .min(1)), so the
// debrief can never render zero tabs on either side.
export function toSnippetTabs(source: CodeSnippet | EngineSecureSnippet[]): SecureSnippet[] {
  return normalizeSecureCode(source).map((t) => ({
    stack: t.label,
    snippet: { language: t.language, code: t.code },
  }))
}

// Fold a level's secure FIX into UI tabs: prefer the per-stack variants, else the
// single legacy snippet.
export function selectSecureSnippets(debrief: DebriefSecure): SecureSnippet[] {
  return toSnippetTabs(debrief.secureCodeVariants ?? debrief.secureCode)
}

// Mirror of selectSecureSnippets for the vulnerable FLAW (docs/04-frontend-ux.md
// §7.2): the debrief now teaches the flaw per-stack too, paired 1:1 with the fix.
// Same adapter, different fields — the helper is not secure-only.
export function selectVulnerableSnippets(debrief: DebriefVulnerable): SecureSnippet[] {
  return toSnippetTabs(debrief.vulnerableCodeVariants ?? debrief.vulnerableCode)
}

// ── Two-level selector model (docs/04-frontend-ux.md §7.2) ──────────────────
// The debrief secure fix is chosen in two steps: LANGUAGE (JavaScript / Python /
// PHP / …) then, only when a language ships more than one driver, the FRAMEWORK
// (PDO vs Laravel, JDBC vs Spring Boot, …). Grouping + label shortening are pure
// so they unit-test in the node suite; the component owns only presentation
// (icons, horizontal scroll, keyboard). Everything is DERIVED from the engine's
// SecureSnippet — no new level-JSON contract.

export interface FrameworkOption {
  label: string // original tab label, e.g. "PHP (PDO)"
  shortLabel: string // language-prefix stripped, e.g. "PDO" / "Laravel"
  snippet: CodeSnippet // { language, code }
}

export interface LanguageGroup {
  language: string // engine language code, e.g. "php"
  name: string // display category, e.g. "PHP"
  options: FrameworkOption[]
}

// Engine language code -> human category. Unknown/legacy codes fall back to a
// capitalized code so a new language can never break (or empty) the selector.
const LANGUAGE_NAMES: Record<string, string> = {
  js: 'JavaScript',
  python: 'Python',
  php: 'PHP',
  java: 'Java',
  csharp: 'C#',
  go: 'Go',
  ruby: 'Ruby',
}

export function languageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? (code ? code[0].toUpperCase() + code.slice(1) : code)
}

// Shorten a driver label by dropping the redundant language prefix:
//   "PHP (PDO)"                 -> "PDO"            (prefix matches -> unwrap parens)
//   "Python (sqlite3 / psycopg2)" -> "sqlite3 / psycopg2"
//   "Laravel (Query Builder)"   -> "Laravel"       (real framework -> drop qualifier)
//   "Django (ORM)"              -> "Django"
// Falls back to the full label when neither rule applies.
export function shortFrameworkLabel(label: string, category: string): string {
  const trimmed = label.trim()
  if (category && trimmed.toLowerCase().startsWith(category.toLowerCase())) {
    const rest = trimmed.slice(category.length).trim()
    const wrapped = rest.match(/^\((.+)\)$/)
    if (wrapped) return wrapped[1].trim()
  }
  const head = trimmed.replace(/\s*\([^()]*\)\s*$/, '').trim()
  return head || trimmed
}

// Fold the flat tab list into ordered language groups. First-appearance order is
// preserved for BOTH languages and their drivers (tab order follows the data,
// never a sort — same guarantee selectSecureSnippets makes). A legacy single
// snippet yields one group with one option.
export function groupSecureSnippets(tabs: SecureSnippet[]): LanguageGroup[] {
  const groups: LanguageGroup[] = []
  const byCode = new Map<string, LanguageGroup>()
  for (const tab of tabs) {
    const code = tab.snippet.language
    let group = byCode.get(code)
    if (!group) {
      group = { language: code, name: languageName(code), options: [] }
      byCode.set(code, group)
      groups.push(group)
    }
    group.options.push({
      label: tab.stack,
      shortLabel: shortFrameworkLabel(tab.stack, group.name),
      snippet: tab.snippet,
    })
  }
  return groups
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

// Total driver options across all language groups (used to size the framework row).
export const optionCount = (groups: LanguageGroup[]) =>
  groups.reduce((n, g) => n + g.options.length, 0)

// Resolve a side's snippet at the selected (lang, fw), guarding both indices: a
// side with fewer languages/drivers than the selector (a legacy single snippet, or
// a count mismatch) falls back to its first group / first option — its single fix.
export function snippetAt(
  groups: LanguageGroup[],
  lang: number,
  fw: number,
): CodeSnippet | undefined {
  const group = groups[lang] ?? groups[0]
  const option = group?.options[fw] ?? group?.options[0]
  return option?.snippet
}
