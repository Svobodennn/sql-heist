import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { SqlCell } from '@/lib/schema/level'
import { loadSqlJs } from '@/lib/engine/sqlLoader'
import { exec, type SqlDatabase } from '@/lib/engine/sqlRunner'

function fakeDb(fn: (sql: string) => Array<{ columns: string[]; values: SqlCell[][] }>): SqlDatabase {
  return { exec: fn }
}

describe('sqlRunner.exec — result shape', () => {
  it('fills columns/rows/rowCount from a result set', () => {
    const db = fakeDb(() => [{ columns: ['id', 'name'], values: [[1, 'a'], [2, 'b']] }])
    const result = exec(db, 'SELECT id, name FROM t')
    expect(result.columns).toEqual(['id', 'name'])
    expect(result.rows).toEqual([[1, 'a'], [2, 'b']])
    expect(result.rowCount).toBe(2)
    expect(result.error).toBeUndefined()
  })

  it('treats an empty result array (0-row SELECT) as zero rows, no error', () => {
    const db = fakeDb(() => [])
    const result = exec(db, "SELECT * FROM t WHERE 1=0")
    expect(result.columns).toEqual([])
    expect(result.rows).toEqual([])
    expect(result.rowCount).toBe(0)
    expect(result.error).toBeUndefined()
  })

  it('echoes the composed sql and reports a numeric durationMs', () => {
    const db = fakeDb(() => [])
    const result = exec(db, 'SELECT 1')
    expect(result.composedSql).toBe('SELECT 1')
    expect(typeof result.durationMs).toBe('number')
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('uses the last statement result for a multi-statement exec', () => {
    const db = fakeDb(() => [
      { columns: ['a'], values: [[1]] },
      { columns: ['b'], values: [[9], [10]] },
    ])
    const result = exec(db, 'SELECT a FROM x; SELECT b FROM y')
    expect(result.columns).toEqual(['b'])
    expect(result.rowCount).toBe(2)
  })
})

describe('sqlRunner.exec — NEVER throws; errors land in .error', () => {
  it('captures a thrown SQLite error into .error instead of throwing', () => {
    const db = fakeDb(() => {
      throw new Error('no such table: nope')
    })
    let result
    expect(() => {
      result = exec(db, 'SELECT * FROM nope')
    }).not.toThrow()
    expect(result!.error).toBe('no such table: nope')
    expect(result!.columns).toEqual([])
    expect(result!.rows).toEqual([])
    expect(result!.rowCount).toBe(0)
  })

  it('stringifies a non-Error throw', () => {
    const db = fakeDb(() => {
      throw 'raw string failure'
    })
    const result = exec(db, 'SELECT 1')
    expect(result.error).toBe('raw string failure')
  })
})

describe('sqlRunner.exec — real SQLite (WASM) error capture', () => {
  const wasmPath = fileURLToPath(new URL('../../../public/sql-wasm.wasm', import.meta.url))

  it('captures a genuine SQLite error message from sql.js', async () => {
    const SQL = await loadSqlJs({ locateFile: () => wasmPath })
    const db = new SQL.Database()
    db.run('CREATE TABLE t(x)')
    db.run('INSERT INTO t(x) VALUES (1)')

    const ok = exec(db, 'SELECT x FROM t')
    expect(ok.rows).toEqual([[1]])
    expect(ok.error).toBeUndefined()

    const bad = exec(db, 'SELECT * FROM ghost_table')
    expect(bad.error).toContain('no such table: ghost_table')
    expect(bad.rowCount).toBe(0)

    db.close()
  })
})
