import { describe, expect, it } from 'vitest'
import type { VisibleTable } from '@/lib/schema/level'
import { accrueDiscovered, initNotebook, notebookSize } from '@/features/game/lib/reconNotebook'

const visible: VisibleTable[] = [{ table: 'articles', columns: ['id', 'title', 'body'] }]

// A sqlite_master read UNION'd into a 2-col result (the Blueprint job): the first
// SELECT's article rows, then catalog rows whose `sql` cell carries each table's own
// CREATE statement — the shape the notebook must mine for pried-loose schema.
const sqliteMasterRows: readonly (readonly unknown[])[] = [
  ['Quarterly Security Review', 'Routine audit completed, no findings.'],
  ['articles', 'CREATE TABLE articles (id INTEGER PRIMARY KEY, title TEXT, body TEXT)'],
  [
    'z_bp_registry_7f3a',
    'CREATE TABLE z_bp_registry_7f3a (id INTEGER PRIMARY KEY, schematic_id TEXT, payload TEXT)',
  ],
]

describe('initNotebook', () => {
  it('seeds advertised table names (lowercased) and no discoveries', () => {
    const nb = initNotebook(visible)
    expect(nb.advertised).toEqual(['articles'])
    expect(nb.discovered).toEqual([])
  })
})

describe('accrueDiscovered', () => {
  it('captures the unlisted table + its columns from a CREATE statement in a result value', () => {
    const nb = accrueDiscovered(initNotebook(visible), sqliteMasterRows)
    // `articles` is advertised -> not re-listed; the hidden table IS the discovery.
    expect(nb.discovered).toEqual([
      { table: 'z_bp_registry_7f3a', columns: ['id', 'schematic_id', 'payload'] },
    ])
  })

  it('mines VALUES, not headers: ignores prose, bare names and non-string cells', () => {
    const nb = accrueDiscovered(initNotebook(visible), [
      ['an article body that merely mentions a table in passing', 42, null],
      ['z_bp_registry_7f3a', 'BP-VAULT-DOOR'], // bare name, no CREATE => nothing pried
    ])
    expect(nb.discovered).toEqual([])
  })

  it('returns a NEW notebook on discovery and never mutates the input', () => {
    const before = initNotebook(visible)
    const after = accrueDiscovered(before, sqliteMasterRows)
    expect(after).not.toBe(before)
    expect(before.discovered).toEqual([])
  })

  it('is immutable and dedupes a table already discovered across successive runs', () => {
    const first = accrueDiscovered(initNotebook(visible), sqliteMasterRows)
    const second = accrueDiscovered(first, sqliteMasterRows)
    expect(second).toBe(first) // nothing new -> same reference (render bail-out)
  })

  it('returns the SAME reference when no rows or only advertised tables surface', () => {
    const nb = initNotebook(visible)
    expect(accrueDiscovered(nb, [])).toBe(nb)
    expect(
      accrueDiscovered(nb, [['articles', 'CREATE TABLE articles (id INTEGER, title TEXT)']]),
    ).toBe(nb) // advertised table -> not a discovery
  })

  it('skips table-level constraints and keeps composite type args intact', () => {
    const nb = accrueDiscovered(initNotebook(visible), [
      [
        'CREATE TABLE vault (ref TEXT, amount DECIMAL(10,2), PRIMARY KEY (ref), FOREIGN KEY (ref) REFERENCES x(id))',
      ],
    ])
    expect(nb.discovered).toEqual([{ table: 'vault', columns: ['ref', 'amount'] }])
  })

  it('dedupes a discovered table case-insensitively against the advertised set', () => {
    const nb = accrueDiscovered(initNotebook(visible), [
      ['CREATE TABLE ARTICLES (id INTEGER, extra TEXT)'], // advertised table, different case
    ])
    expect(nb.discovered).toEqual([])
  })

  it('unwraps quoted identifiers for the table and its columns', () => {
    const nb = accrueDiscovered(initNotebook(visible), [
      ['CREATE TABLE "secret drawer" ("holder name" TEXT, `balance` REAL)'],
    ])
    expect(nb.discovered).toEqual([
      { table: 'secret drawer', columns: ['holder name', 'balance'] },
    ])
  })
})

describe('notebookSize', () => {
  it('counts discovered tables and their columns for the a11y summary', () => {
    const nb = accrueDiscovered(initNotebook(visible), sqliteMasterRows)
    expect(notebookSize(nb)).toEqual({ tables: 1, columns: 3 })
  })

  it('is zero when nothing has been pried loose', () => {
    expect(notebookSize(initNotebook(visible))).toEqual({ tables: 0, columns: 0 })
  })
})
