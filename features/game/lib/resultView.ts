import type { SqlCell } from '@/lib/engine/sqlRunner'
import type { WinCondition } from '@/lib/schema/level'

// Presentation-only helpers for <ResultGrid> (docs/04-frontend-ux.md §5.4). These
// derive DISPLAY state (cell text, which cells/rows to badge as loot) — the real
// win decision stays in the frozen engine (winEvaluator). Kept out of the
// component so the view is render-only and this logic is unit-testable.

export function cellToText(cell: SqlCell): string {
  if (cell === null) return 'NULL'
  if (cell instanceof Uint8Array) return '[blob]'
  return String(cell)
}

// Which cells/rows hold the loot, so the grid can badge them. Mirrors the
// evaluator's INTENT for display only — never the authoritative win check.
export function computeLoot(
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
