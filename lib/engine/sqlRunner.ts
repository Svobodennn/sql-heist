import type { SqlCell } from '@/lib/schema/level'

export type { SqlCell }

// Execution against the fresh in-memory DB (docs/01-architecture.md §3.2, §2.3).
// This wrapper ALWAYS catches SQLite errors into `.error` — it never throws
// (§3.3). Error capture is not just defensive: v1 error-based techniques turn
// the message into a win-condition signal.

// Minimal structural view of what exec needs from a database. sql.js `Database`
// satisfies this (its exec returns the same shape), and tests can pass a fake.
export interface SqlDatabase {
  exec(sql: string): Array<{ columns: string[]; values: SqlCell[][] }>
}

export interface ExecutionResult {
  composedSql: string
  columns: string[]
  rows: ReadonlyArray<ReadonlyArray<SqlCell>>
  rowCount: number
  error?: string // SQLite message (error-based techniques + UI feedback)
  durationMs: number // time-based techniques (v1) + UX
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

export function exec(db: SqlDatabase, sql: string): ExecutionResult {
  const start = now()
  try {
    const results = db.exec(sql)
    // sql.js returns one result set per row-producing statement; a 0-row SELECT
    // returns []. MVP is a single SELECT, so the LAST set is the one to read.
    const last = results.length > 0 ? results[results.length - 1] : undefined
    const columns = last ? last.columns : []
    const rows = last ? last.values : []
    return {
      composedSql: sql,
      columns,
      rows,
      rowCount: rows.length,
      durationMs: now() - start,
    }
  } catch (error) {
    return {
      composedSql: sql,
      columns: [],
      rows: [],
      rowCount: 0,
      error: error instanceof Error ? error.message : String(error),
      durationMs: now() - start,
    }
  }
}
