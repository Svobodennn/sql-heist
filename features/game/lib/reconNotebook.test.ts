import { describe, expect, it } from 'vitest'
import type { VisibleTable } from '@/lib/schema/level'
import { accrueColumns, initNotebook, notebookSize } from './reconNotebook'

const visible: VisibleTable[] = [
  { table: 'products', columns: ['id', 'name', 'price'] },
  { table: 'users', columns: ['id', 'email'] },
]

describe('initNotebook', () => {
  it('seeds from visibleSchema and copies the arrays (frozen level stays canonical)', () => {
    const nb = initNotebook(visible)
    expect(nb.tables).toEqual(visible)
    expect(nb.tables[0].columns).not.toBe(visible[0].columns)
    expect(nb.discoveredColumns).toEqual([])
  })
})

describe('accrueColumns', () => {
  it('adds result columns not already advertised, in first-seen order', () => {
    const nb = accrueColumns(initNotebook(visible), ['id', 'password_hash', 'is_admin'])
    // `id` is advertised -> skipped; the two novel columns are recorded in order.
    expect(nb.discoveredColumns).toEqual(['password_hash', 'is_admin'])
  })

  it('is immutable and dedupes across successive runs', () => {
    const first = accrueColumns(initNotebook(visible), ['secret'])
    const second = accrueColumns(first, ['secret', 'token'])
    expect(first.discoveredColumns).toEqual(['secret'])
    expect(second.discoveredColumns).toEqual(['secret', 'token'])
    expect(second).not.toBe(first)
  })

  it('returns the SAME reference when nothing new is learned (render bail-out)', () => {
    const nb = accrueColumns(initNotebook(visible), ['secret'])
    expect(accrueColumns(nb, [])).toBe(nb)
    expect(accrueColumns(nb, ['id', 'email', 'secret'])).toBe(nb) // all known/seen
  })

  it('ignores blank/whitespace column names', () => {
    const nb = accrueColumns(initNotebook(visible), ['', '  ', 'real'])
    expect(nb.discoveredColumns).toEqual(['real'])
  })

  it('trims before comparing so a padded known column is not re-discovered', () => {
    const nb = accrueColumns(initNotebook(visible), ['  price  '])
    expect(nb.discoveredColumns).toEqual([])
  })
})

describe('notebookSize', () => {
  it('counts advertised + discovered columns for the a11y summary', () => {
    const nb = accrueColumns(initNotebook(visible), ['pw', 'ssn'])
    expect(notebookSize(nb)).toEqual({ tables: 2, columns: 5 + 2 })
  })
})
