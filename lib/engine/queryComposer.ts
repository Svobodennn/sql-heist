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
}

export function compose(
  template: string,
  inputs: Readonly<Record<string, string>>,
): ComposedQuery {
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

    if (Object.prototype.hasOwnProperty.call(inputs, field)) {
      const value = inputs[field]
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

  return { sql, template, inputs: { ...inputs }, unresolved, segments }
}
