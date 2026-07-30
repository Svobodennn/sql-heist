import type { VisibleTable } from '@/lib/schema/level'

// Recon notebook (docs/ws3-design.md "UI scope"): a client-side ledger of what the
// player has PRIED LOOSE this job — schema that recon never advertised but that
// surfaced as a run's result VALUES (classically, a hidden table's CREATE statement
// UNION'd out of sqlite_master). Pure + immutable so it unit-tests in the node suite
// and never mutates the frozen level; the ExploitConsole holds one in React state and
// folds each clean result's rows into it.
//
// It deliberately does NOT carry the advertised visibleSchema. That already lives in
// the top recon recap, and re-listing it here was the WS3 defect: the notebook mirrored
// the recap and its "discovered" half stayed forever empty (it folded result COLUMN
// HEADERS — always the app's own labels — instead of the injected VALUES).

export interface DiscoveredTable {
  table: string
  columns: string[]
}

export interface ReconNotebook {
  // Advertised table names (lowercased), kept ONLY to decide what is genuinely new.
  // NEVER rendered — the recap already shows visibleSchema.
  advertised: string[]
  // Tables (+ their columns) discovered from result VALUES, first-seen order, deduped
  // by table. This is the notebook's whole purpose: schema recon never listed.
  discovered: DiscoveredTable[]
}

export function initNotebook(visibleSchema: VisibleTable[]): ReconNotebook {
  return {
    advertised: visibleSchema.map((t) => t.table.toLowerCase()),
    discovered: [],
  }
}

// Fold a clean run's result ROWS into the notebook. Scans every string cell for CREATE
// TABLE statements (the shape a UNION against sqlite_master leaks) and records any table
// not already advertised or discovered. Returns the SAME reference when nothing new was
// learned so React can bail out of a re-render; otherwise a new immutable notebook.
export function accrueDiscovered(
  nb: ReconNotebook,
  rows: ReadonlyArray<ReadonlyArray<unknown>>,
): ReconNotebook {
  if (rows.length === 0) return nb
  const known = new Set([...nb.advertised, ...nb.discovered.map((d) => d.table.toLowerCase())])
  const additions: DiscoveredTable[] = []
  for (const row of rows) {
    for (const cell of row) {
      if (typeof cell !== 'string') continue
      for (const found of parseCreateTables(cell)) {
        const key = found.table.toLowerCase()
        if (known.has(key)) continue
        known.add(key)
        additions.push(found)
      }
    }
  }
  if (additions.length === 0) return nb
  return { ...nb, discovered: [...nb.discovered, ...additions] }
}

// Distinct facts pried loose — drives the notebook's a11y summary count.
export function notebookSize(nb: ReconNotebook): { tables: number; columns: number } {
  const columns = nb.discovered.reduce((sum, t) => sum + t.columns.length, 0)
  return { tables: nb.discovered.length, columns }
}

// ── CREATE TABLE extraction ───────────────────────────────────────────────────────
// A sqlite_master read hands back each table's original CREATE statement as a plain
// string cell. Parse the table name + column names out of it, tolerating quoted idents,
// nested-paren type args (DECIMAL(10,2)) and table-level constraints (PRIMARY KEY (...)).

const CREATE_TABLE =
  /create\s+(?:temp(?:orary)?\s+)?table\s+(?:if\s+not\s+exists\s+)?(?:[a-z0-9_]+\.)?("(?:[^"]|"")+"|`(?:[^`]|``)+`|\[[^\]]+\]|[a-z_][a-z0-9_$]*)\s*\(/gi

// Column-def slots led by these keywords are table constraints, not columns.
const CONSTRAINT_LEADERS = new Set(['primary', 'foreign', 'unique', 'check', 'constraint'])

const LEADING_IDENT = /^\s*("(?:[^"]|"")+"|`(?:[^`]|``)+`|\[[^\]]+\]|[a-z_][a-z0-9_$]*)/i

function unquoteIdent(raw: string): string {
  const s = raw.trim()
  if (s.length >= 2) {
    const head = s[0]
    const tail = s[s.length - 1]
    if (head === '"' && tail === '"') return s.slice(1, -1).replace(/""/g, '"')
    if (head === '`' && tail === '`') return s.slice(1, -1).replace(/``/g, '`')
    if (head === '[' && tail === ']') return s.slice(1, -1)
  }
  return s
}

// Content between the '(' at openIdx and its matching ')', respecting nested parens and
// quoted spans. null if the parens never balance (truncated/garbage input).
function balancedBody(text: string, openIdx: number): string | null {
  let depth = 0
  let quote: string | null = null
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i]
    if (quote) {
      if (ch === quote) quote = null
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch
    else if (ch === '(') depth++
    else if (ch === ')') {
      depth--
      if (depth === 0) return text.slice(openIdx + 1, i)
    }
  }
  return null
}

// Split a column-def list on TOP-LEVEL commas so DECIMAL(10,2) / composite keys stay whole.
function splitDefs(body: string): string[] {
  const defs: string[] = []
  let depth = 0
  let quote: string | null = null
  let start = 0
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (quote) {
      if (ch === quote) quote = null
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch
    else if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (ch === ',' && depth === 0) {
      defs.push(body.slice(start, i))
      start = i + 1
    }
  }
  defs.push(body.slice(start))
  return defs
}

function columnName(def: string): string | null {
  const m = def.match(LEADING_IDENT)
  if (!m) return null
  const name = unquoteIdent(m[1])
  if (CONSTRAINT_LEADERS.has(name.toLowerCase())) return null
  return name
}

function parseCreateTables(text: string): DiscoveredTable[] {
  if (!/create\s/i.test(text)) return [] // cheap bail-out for ordinary prose cells
  const out: DiscoveredTable[] = []
  CREATE_TABLE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = CREATE_TABLE.exec(text)) !== null) {
    const openIdx = CREATE_TABLE.lastIndex - 1
    const body = balancedBody(text, openIdx)
    if (body === null) continue
    CREATE_TABLE.lastIndex = openIdx + body.length + 2 // resume past the matching ')'
    const columns: string[] = []
    const seen = new Set<string>()
    for (const def of splitDefs(body)) {
      const col = columnName(def)
      if (!col) continue
      const key = col.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      columns.push(col)
    }
    out.push({ table: unquoteIdent(m[1]), columns })
  }
  return out
}
