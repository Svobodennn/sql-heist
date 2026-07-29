import type { InputFilter } from '@/lib/schema/level'

// Raw injection composer (docs/01-architecture.md §3). This is where the game's
// deliberate vulnerability LIVES: {{input:field}} tokens are replaced with the
// player's RAW value — no escape, no quoting, no parameterization. Fixing that
// would break the game (§3.3). PURE: no DB access, deterministic, no mutation.

// Segment split (static vs injected) is emitted BY the composer as it builds the
// SQL — this is what <SqlPreview> highlights. It is composer-correct, never a
// regex guess over the composed output (PLAN §2.2, 04 "THE WIRE").
export type ComposedSegment =
  | { kind: 'static'; text: string }
  | { kind: 'injected'; field: string; value: string }

export interface ComposedQuery {
  sql: string // the REAL SQL after raw injection
  template: string // original template (debrief diff)
  inputs: Readonly<Record<string, string>> // values used (debrief/telemetry)
  unresolved: string[] // token names given no value (validation)
  segments: ComposedSegment[] // static/injected split for the live preview
  // WS3 WAF: present ONLY when an inputFilter ran. `rejected` => the run should be
  // blocked (levelSession surfaces filterMessage as an error). Absent otherwise.
  rejected?: boolean
  filterMessage?: string
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Apply the WAF filter to RAW inputs BEFORE substitution (pure). `reject` flags
// the run when any value carries a blocked term; `strip` removes blocked
// substrings (case-insensitive). Never mutates the caller's inputs.
function applyInputFilter(
  inputs: Readonly<Record<string, string>>,
  filter: InputFilter,
): { inputs: Readonly<Record<string, string>>; rejected: boolean; message?: string } {
  const terms = filter.blocklist.filter((t) => t.length > 0)
  const hits = (value: string) => {
    const hay = value.toLowerCase()
    return terms.some((t) => hay.includes(t.toLowerCase()))
  }

  if (filter.mode === 'reject') {
    const blocked = Object.values(inputs).some(hits)
    return blocked
      ? { inputs, rejected: true, message: filter.message ?? 'Input rejected by the filter.' }
      : { inputs, rejected: false }
  }

  const cleaned: Record<string, string> = {}
  for (const [key, value] of Object.entries(inputs)) {
    cleaned[key] = terms.reduce(
      (acc, t) => acc.replace(new RegExp(escapeRegExp(t), 'gi'), ''),
      value,
    )
  }
  return { inputs: cleaned, rejected: false }
}

export function compose(
  template: string,
  inputs: Readonly<Record<string, string>>,
  inputFilter?: InputFilter,
): ComposedQuery {
  // WS3: pre-process raw inputs through the WAF. Absent => effectiveInputs is the
  // caller's inputs untouched (zero behavior change; injection contract intact).
  let effectiveInputs = inputs
  let rejected = false
  let filterMessage: string | undefined
  if (inputFilter) {
    const applied = applyInputFilter(inputs, inputFilter)
    effectiveInputs = applied.inputs
    rejected = applied.rejected
    filterMessage = applied.message
  }

  const tokenRe = /\{\{input:([^}]+)\}\}/g
  const segments: ComposedSegment[] = []
  const unresolved: string[] = []
  const seenUnresolved = new Set<string>()
  let sql = ''
  let cursor = 0
  let match: RegExpExecArray | null

  const emitStatic = (text: string) => {
    if (text.length === 0) return
    sql += text
    segments.push({ kind: 'static', text })
  }

  while ((match = tokenRe.exec(template)) !== null) {
    const field = match[1]
    emitStatic(template.slice(cursor, match.index))

    if (Object.prototype.hasOwnProperty.call(effectiveInputs, field)) {
      const value = effectiveInputs[field]
      sql += value
      segments.push({ kind: 'injected', field, value })
    } else {
      // No value for this token: keep the literal placeholder and flag it. It is
      // not player-injected content, so it renders as static (unfilled hole).
      emitStatic(match[0])
      if (!seenUnresolved.has(field)) {
        seenUnresolved.add(field)
        unresolved.push(field)
      }
    }
    cursor = match.index + match[0].length
  }

  emitStatic(template.slice(cursor))

  // `inputs` echoes what the PLAYER typed (telemetry/debrief), even when strip
  // rewrote the value that actually hit the wire (that shows in `segments`).
  const composed: ComposedQuery = { sql, template, inputs: { ...inputs }, unresolved, segments }
  return inputFilter ? { ...composed, rejected, filterMessage } : composed
}
