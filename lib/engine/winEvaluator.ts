import type { SqlCell, WinCondition } from '@/lib/schema/level'
import type { ExecutionResult } from '@/lib/engine/sqlRunner'

// Pure win-condition evaluator (docs/01-architecture.md §5). Knows nothing about
// the DB or WASM — it only reads an execution-derived context. Kept separate
// from exec (§3.3 SRP) so each level can be table-tested payload -> expected win.

export interface WinContext {
  inputs: Readonly<Record<string, string>>
  composedSql: string
  columns: string[]
  rows: ReadonlyArray<ReadonlyArray<SqlCell>>
  rowCount: number
  error?: string
  // Row-producing result sets from the run (WS3 stacked-queries). Optional; a
  // missing value is treated as "unknown" (< any min), so it never trivially wins.
  resultSetCount?: number
}

export interface WinEvaluation {
  won: boolean
  reason: string
}

// Bridge an ExecutionResult (§3.2) + the player inputs into the evaluator's
// context (§5.1). Pure; evaluate() stays decoupled from exec — this is the only
// place the two shapes meet.
export function toWinContext(
  result: ExecutionResult,
  inputs: Readonly<Record<string, string>>,
): WinContext {
  return {
    inputs,
    composedSql: result.composedSql,
    columns: result.columns,
    rows: result.rows,
    rowCount: result.rowCount,
    error: result.error,
    resultSetCount: result.resultSetCount,
  }
}

function lose(reason: string): WinEvaluation {
  return { won: false, reason }
}

function win(reason: string): WinEvaluation {
  return { won: true, reason }
}

// null/BLOB cells can't match a text flag or an expected scalar; render the rest
// to a comparable string. Numbers stringify so a numeric flag ("42") still hits.
function cellToText(cell: SqlCell): string | null {
  if (cell === null || cell instanceof Uint8Array) return null
  return typeof cell === 'number' ? String(cell) : cell
}

function cellEquals(a: SqlCell, b: SqlCell): boolean {
  if (a instanceof Uint8Array && b instanceof Uint8Array) {
    return a.length === b.length && a.every((byte, i) => byte === b[i])
  }
  return a === b
}

function rowToObject(columns: string[], row: ReadonlyArray<SqlCell>): Record<string, SqlCell> {
  const obj: Record<string, SqlCell> = {}
  columns.forEach((col, i) => {
    obj[col] = row[i] ?? null
  })
  return obj
}

export function evaluate(cond: WinCondition, ctx: WinContext): WinEvaluation {
  // error-based (WS3): a TARGETED SQLite error IS the win — data leaks through
  // the message. Checked BEFORE the generic guard below, so it is the ONLY win
  // type that treats an error as success; every other type keeps the guard.
  if (cond.type === 'error-based') {
    if (!ctx.error) {
      return lose(cond.reason ?? 'No error surfaced — the injection did not trip the parser.')
    }
    const targeted = cond.errorContains === undefined || ctx.error.includes(cond.errorContains)
    return targeted
      ? win(cond.reason ?? 'The database leaked through its error message.')
      : lose(cond.reason ?? 'An error came back, but not the targeted one.')
  }

  // Anti-trivial guard (§5.3): a failed query is never a win in MVP. Without
  // this, `rows-returned {min:0}` would pass on an errored 0-row result.
  if (ctx.error) {
    return lose(`Query failed: ${ctx.error}`)
  }

  switch (cond.type) {
    case 'rows-returned': {
      const withinMin = ctx.rowCount >= cond.min
      const withinMax = cond.max === undefined || ctx.rowCount <= cond.max
      return withinMin && withinMax
        ? win(cond.reason ?? "You're in — the query let a row through.")
        : lose(cond.reason ?? 'No row came back. The condition still holds you out.')
    }

    case 'flag-in-result': {
      if (cond.flag.length === 0) {
        return lose('No flag configured.')
      }
      const caseSensitive = cond.caseSensitive ?? false
      const needle = caseSensitive ? cond.flag : cond.flag.toLowerCase()
      const columnIndex = cond.column ? ctx.columns.indexOf(cond.column) : -1
      if (cond.column && columnIndex === -1) {
        return lose(cond.reason ?? `Column "${cond.column}" is not in the result.`)
      }

      for (const row of ctx.rows) {
        const cells = cond.column ? [row[columnIndex]] : row
        for (const cell of cells) {
          const text = cellToText(cell)
          if (text === null) continue
          const haystack = caseSensitive ? text : text.toLowerCase()
          if (haystack.includes(needle)) {
            return win(cond.reason ?? 'Loot surfaced in the result grid.')
          }
        }
      }
      return lose(cond.reason ?? 'The loot is not in this result yet.')
    }

    case 'row-match': {
      const rowObjects = ctx.rows.map((row) => rowToObject(ctx.columns, row))
      for (const expected of cond.expect) {
        const expectedKeys = Object.keys(expected)
        for (const rowObj of rowObjects) {
          const allPairsMatch = expectedKeys.every(
            (key) =>
              Object.prototype.hasOwnProperty.call(rowObj, key) &&
              cellEquals(rowObj[key], expected[key]),
          )
          // subset: the row may carry EXTRA columns beyond the expected pairs.
          // exact:  the row's column SET must equal the expected keys — 1:1
          //         (§5.2). allPairsMatch already proves "no missing"; the count
          //         of the row's (deduped) keys proves "no extra". Using the row
          //         object's key count (not ctx.columns.length) makes the intent
          //         explicit and is robust to duplicate result column names.
          const noExtraColumns = Object.keys(rowObj).length === expectedKeys.length
          const shapeOk = cond.mode === 'subset' || noExtraColumns
          if (allPairsMatch && shapeOk) {
            return win(cond.reason ?? 'Target row matched — you have what you came for.')
          }
        }
      }
      return lose(cond.reason ?? 'No returned row matches the target yet.')
    }

    case 'blind-boolean':
    case 'blind-timing': {
      // Boolean/timing oracle: the TRUE branch surfaces a row. blind-timing is
      // modeled SYMBOLICALLY — sql.js is synchronous, so durationMs is NEVER
      // read; the oracle's TRUE state is a returned row (same signal as boolean).
      // Differentiation TRUE↔FALSE is a level property (solve wins; the FALSE/
      // benign probe returns 0 rows and loses via the guard above).
      return ctx.rowCount > 0
        ? win(cond.reason ?? 'The oracle answered TRUE — a row came back.')
        : lose(cond.reason ?? 'The oracle answered FALSE — no row came back.')
    }

    case 'stacked-queries': {
      // A stacked payload appends a statement whose result set is observable.
      // The app query yields N result sets; a stacked read/verify yields more.
      const min = cond.minResultSets ?? 2
      return (ctx.resultSetCount ?? 0) >= min
        ? win(cond.reason ?? 'Stacked statement executed — an extra result set surfaced.')
        : lose(cond.reason ?? 'Only one statement ran — stack another to reveal the effect.')
    }
  }
}
