import { fileURLToPath } from 'node:url'
import type { Database } from 'sql.js'
import { afterAll, describe, expect, it } from 'vitest'
import { loadSqlJs } from '@/lib/engine/sqlLoader'

// Vitest runs in Node with no HTTP origin, so the browser default
// `locateFile: () => '/sql-wasm.wasm'` can't resolve. Point the loader at the
// COPIED public asset — this doubles as proof that public/sql-wasm.wasm is a
// valid, bootable WASM binary (the highest P0 risk, docs/PLAN.md §10).
const wasmPath = fileURLToPath(new URL('../../public/sql-wasm.wasm', import.meta.url))
const testOptions = { locateFile: () => wasmPath }

describe('sqlLoader — WASM boot smoke', () => {
  let db: Database | undefined

  afterAll(() => {
    db?.close()
  })

  it('boots the SQLite WASM and runs a real DDL/DML/SELECT round-trip', async () => {
    const SQL = await loadSqlJs(testOptions)

    db = new SQL.Database()
    db.run('CREATE TABLE t(x)')
    db.run('INSERT INTO t(x) VALUES (1)')

    const result = db.exec('SELECT x FROM t')

    expect(result).toHaveLength(1)
    expect(result[0].columns).toEqual(['x'])
    expect(result[0].values).toEqual([[1]])
  })

  it('caches the module as a singleton (second call reuses, never re-inits)', async () => {
    const first = await loadSqlJs(testOptions)
    // No options: would target the unreachable '/sql-wasm.wasm', but the cache
    // wins — proving load-once behavior.
    const second = await loadSqlJs()

    expect(second).toBe(first)
  })
})
