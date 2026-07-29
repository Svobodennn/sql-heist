'use client'

import type { ExecutionResult, SqlCell } from '@/lib/engine/sqlRunner'
import type { WinCondition } from '@/lib/schema/level'
import { cx } from '../lib/cx'
import { IconAlert, IconLootTag } from './icons'
import styles from './ResultGrid.module.css'

// RESULT (docs/04-frontend-ux.md §5.4): the query result as a real <table>, the
// verbatim SQLite error (errors are teachers here), or the "no run yet" empty
// state. Loot is flagged with icon + label + tint (never color alone, §11).
// All cell text is React-escaped (K7/XSS).

interface ResultGridProps {
  result: ExecutionResult | null
  winCondition?: WinCondition
  loading?: boolean
  className?: string
}

function cellToText(cell: SqlCell): string {
  if (cell === null) return 'NULL'
  if (cell instanceof Uint8Array) return '[blob]'
  return String(cell)
}

// Which cells/rows hold the loot, so we can badge them. Mirrors the evaluator's
// intent for display only — the real win decision stays in the frozen engine.
function computeLoot(
  win: WinCondition | undefined,
  columns: string[],
  rows: ReadonlyArray<ReadonlyArray<SqlCell>>,
): { cells: Set<string>; rows: Set<number> } {
  const cells = new Set<string>()
  const rowSet = new Set<number>()
  if (!win) return { cells, rows: rowSet }

  if (win.type === 'flag-in-result') {
    const cs = win.caseSensitive ?? false
    const needle = cs ? win.flag : win.flag.toLowerCase()
    const colIdx = win.column ? columns.indexOf(win.column) : -1
    rows.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (win.column && c !== colIdx) return
        if (cell === null || cell instanceof Uint8Array) return
        const hay = cs ? String(cell) : String(cell).toLowerCase()
        if (hay.includes(needle)) {
          cells.add(`${r}:${c}`)
          rowSet.add(r)
        }
      })
    })
  } else if (win.type === 'row-match') {
    rows.forEach((row, r) => {
      const obj: Record<string, SqlCell> = {}
      columns.forEach((col, i) => (obj[col] = row[i] ?? null))
      const hit = win.expect.some((exp) =>
        Object.keys(exp).every(
          (k) => Object.prototype.hasOwnProperty.call(obj, k) && obj[k] === exp[k],
        ),
      )
      if (hit) rowSet.add(r)
    })
  }
  return { cells, rows: rowSet }
}

export function ResultGrid({ result, winCondition, loading, className }: ResultGridProps) {
  if (loading) {
    return (
      <div className={cx(styles.wrap, className)} aria-busy="true" aria-label="Running query">
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.skeletonRow}>
            <span className={styles.shimmer} />
          </div>
        ))}
      </div>
    )
  }

  if (!result) {
    return (
      <div className={cx(styles.wrap, styles.empty, className)}>
        <p className={styles.emptyText}>No run yet — inject a payload and hit the wire.</p>
      </div>
    )
  }

  if (result.error) {
    return (
      <div className={cx(styles.wrap, styles.error, className)} role="alert">
        <p className={styles.errorHead}>
          <IconAlert size={16} />
          <span>ERROR READOUT</span>
        </p>
        <pre className={cx('mono', styles.errorMsg)}>{result.error}</pre>
        <p className={styles.errorGloss}>
          SQLite rejected the statement. Read it closely — the error is a clue, not a wall.
        </p>
      </div>
    )
  }

  if (result.rowCount === 0) {
    return (
      <div className={cx(styles.wrap, styles.empty, className)}>
        <p className={styles.emptyText}>Query ran — 0 rows. Nothing here yet; adjust the payload.</p>
      </div>
    )
  }

  const loot = computeLoot(winCondition, result.columns, result.rows)

  return (
    <div className={cx(styles.wrap, className)}>
      <div className={styles.scroll}>
        <table className={cx('mono', styles.table)}>
          <thead>
            <tr>
              {result.columns.map((col) => (
                <th key={col} scope="col">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, r) => {
              const isLootRow = loot.rows.has(r)
              return (
                <tr key={r} className={cx(isLootRow && styles.lootRow)}>
                  {row.map((cell, c) => {
                    const isLootCell = loot.cells.has(`${r}:${c}`)
                    return (
                      <td key={c} className={cx(isLootCell && styles.lootCell)}>
                        <span>{cellToText(cell)}</span>
                        {isLootRow && c === 0 && (
                          <span className={styles.lootTag}>
                            <IconLootTag size={13} />
                            loot
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className={styles.meta}>
        {result.rowCount} row{result.rowCount === 1 ? '' : 's'} · {Math.round(result.durationMs)}ms
      </p>
    </div>
  )
}
