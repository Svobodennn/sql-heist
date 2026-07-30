import type { VisibleTable } from '@/lib/schema/level'

// Recon notebook (docs/ws3-design.md "UI scope"): a running, client-side ledger of
// what the player has DISCOVERED this job — the union of the level's advertised
// `visibleSchema` and any column names that surfaced in a run's result grid. Pure
// + immutable so it unit-tests in the node suite and never mutates the frozen
// level; the ExploitConsole holds one of these in React state and folds each new
// result into it.

export interface ReconNotebook {
  // Seeded from visibleSchema (recon-advertised) — the baseline the player starts
  // with. Copied so callers can't reach back into the frozen level arrays.
  tables: { table: string; columns: string[] }[]
  // Column names seen in results that were NOT already advertised in any table,
  // in first-seen order (deduped). These are the "made the DB name it" wins.
  discoveredColumns: string[]
}

function knownColumnSet(tables: ReconNotebook['tables']): Set<string> {
  const known = new Set<string>()
  for (const t of tables) for (const c of t.columns) known.add(c)
  return known
}

export function initNotebook(visibleSchema: VisibleTable[]): ReconNotebook {
  return {
    tables: visibleSchema.map((t) => ({ table: t.table, columns: [...t.columns] })),
    discoveredColumns: [],
  }
}

// Fold a run's result columns into the notebook. Returns the SAME reference when
// nothing new was learned (so React can bail out of a re-render); otherwise a new
// immutable notebook with the novel columns appended in first-seen order. A column
// already advertised in visibleSchema or already discovered is ignored.
export function accrueColumns(nb: ReconNotebook, columns: readonly string[]): ReconNotebook {
  if (columns.length === 0) return nb
  const known = knownColumnSet(nb.tables)
  const already = new Set(nb.discoveredColumns)
  const additions: string[] = []
  for (const raw of columns) {
    const col = raw.trim()
    if (col.length === 0) continue
    if (known.has(col) || already.has(col)) continue
    already.add(col)
    additions.push(col)
  }
  if (additions.length === 0) return nb
  return { ...nb, discoveredColumns: [...nb.discoveredColumns, ...additions] }
}

// Total distinct facts the player holds — drives the notebook's a11y summary count.
export function notebookSize(nb: ReconNotebook): { tables: number; columns: number } {
  const advertised = nb.tables.reduce((sum, t) => sum + t.columns.length, 0)
  return { tables: nb.tables.length, columns: advertised + nb.discoveredColumns.length }
}
