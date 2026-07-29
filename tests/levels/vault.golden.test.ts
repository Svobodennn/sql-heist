import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createSqlEngine, type LevelSession, type SqlEngine } from '@/lib/engine/levelSession'
import { evaluate, toWinContext } from '@/lib/engine/winEvaluator'
import { loadSqlJs } from '@/lib/engine/sqlLoader'
import { parseLevel } from '@/lib/schema/level'
import vaultJson from '@/content/levels/vault.json'

// Golden test (docs/PLAN.md §8): UNION extraction against the FROZEN engine.
// Locks the 3-column invariant (R4), the winning cross-table UNION, benign
// no-win, single-sourced loot (K5), and the parametrized secure fix -> [].

const wasmPath = fileURLToPath(new URL('../../public/sql-wasm.wasm', import.meta.url))
const level = parseLevel(vaultJson)
const FLAG = 'LOOT-VAULT-9F2C4471'

let engine: SqlEngine
let session: LevelSession

beforeAll(async () => {
  engine = createSqlEngine({ locateFile: () => wasmPath })
  await engine.init()
  session = await engine.openLevel(level)
})

afterAll(() => {
  session?.dispose()
})

describe('vault.json — schema + golden payload', () => {
  it('validates against the canonical Level schema', () => {
    expect(level.id).toBe('vault')
    expect(level.technique).toBe('union-extraction')
    expect(level.winCondition).toMatchObject({ type: 'flag-in-result', flag: FLAG })
  })

  it('loot flag is single-sourced: it appears exactly once in the seed (K5)', () => {
    const occurrences = level.database.seedSql.split(FLAG).length - 1
    expect(occurrences).toBe(1)
  })

  it('WIN: the UNION extraction surfaces the vault loot flag', () => {
    const inputs = level.expectedSolution.inputs
    const result = session.run(inputs)
    expect(result.error).toBeUndefined()
    expect(evaluate(level.winCondition, toWinContext(result, inputs)).won).toBe(true)
  })

  it('NO WIN: a benign product search returns only products, no flag (anti-trivial)', () => {
    const inputs = { q: 'Drill' }
    const result = session.run(inputs)
    expect(result.rowCount).toBe(1) // matches "Thermal Drill"
    expect(evaluate(level.winCondition, toWinContext(result, inputs)).won).toBe(false)
  })
})

describe('vault.json — column-count invariant: UNION = 3 columns (R4)', () => {
  it('ORDER BY 3 is accepted, ORDER BY 4 errors (3 projected columns)', () => {
    expect(session.run({ q: "' ORDER BY 3 -- " }).error).toBeUndefined()
    expect(session.run({ q: "' ORDER BY 4 -- " }).error).toBeDefined()
  })

  it('UNION SELECT with 3 NULLs is accepted, 2 NULLs errors', () => {
    expect(session.run({ q: "' UNION SELECT NULL, NULL, NULL -- " }).error).toBeUndefined()
    expect(session.run({ q: "' UNION SELECT NULL, NULL -- " }).error).toBeDefined()
  })
})

describe('vault.json — secure fix neutralizes the payload (PLAN §8)', () => {
  it('the parametrized LIKE reduces the winning payload to [] rows', async () => {
    const SQL = await loadSqlJs({ locateFile: () => wasmPath })
    const db = new SQL.Database()
    db.run(level.database.schemaSql)
    db.run(level.database.seedSql)

    // debrief.secureCode form: the % wildcards are added in code; q is BOUND.
    const stmt = db.prepare('SELECT id, name, price FROM products WHERE name LIKE ?')
    stmt.bind(['%' + level.expectedSolution.inputs.q + '%'])
    const rows: unknown[] = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    stmt.free()
    db.close()

    expect(rows).toEqual([])
  })
})
