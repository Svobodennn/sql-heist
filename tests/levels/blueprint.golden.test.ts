import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createSqlEngine, type LevelSession, type SqlEngine } from '@/lib/engine/levelSession'
import { evaluate, toWinContext } from '@/lib/engine/winEvaluator'
import { loadSqlJs } from '@/lib/engine/sqlLoader'
import { parseLevel } from '@/lib/schema/level'
import blueprintJson from '@/content/levels/blueprint.json'

// Golden test (docs/PLAN.md §8): schema discovery + UNION against the FROZEN
// engine. Locks the 2-column invariant (R4), that the hidden loot table is NOT
// in visibleSchema (K6), that the sqlite_master discovery step is a non-terminal
// milestone (not a win), the winning extraction, and the secure fix -> [].

const wasmPath = fileURLToPath(new URL('../../public/sql-wasm.wasm', import.meta.url))
const level = parseLevel(blueprintJson)
const FLAG = 'LOOT-BLUEPRINT-3D1F8A22'
const HIDDEN_TABLE = 'z_bp_registry_7f3a'

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

describe('blueprint.json — schema + golden payload', () => {
  it('validates against the canonical Level schema', () => {
    expect(level.id).toBe('blueprint')
    expect(level.technique).toBe('schema-discovery')
    expect(level.winCondition).toMatchObject({ type: 'flag-in-result', flag: FLAG })
  })

  it('hides the loot table from recon: it is seeded but NOT in visibleSchema (K6)', () => {
    expect(level.database.schemaSql).toContain(HIDDEN_TABLE)
    expect(level.database.visibleSchema.some((t) => t.table === HIDDEN_TABLE)).toBe(false)
  })

  it('loot flag is single-sourced: it appears exactly once in the seed (K5)', () => {
    const occurrences = level.database.seedSql.split(FLAG).length - 1
    expect(occurrences).toBe(1)
  })

  it('WIN: the UNION extraction from the hidden registry surfaces the flag', () => {
    const inputs = level.expectedSolution.inputs
    const result = session.run(inputs)
    expect(result.error).toBeUndefined()
    expect(evaluate(level.winCondition, toWinContext(result, inputs)).won).toBe(true)
  })

  it('NO WIN: a benign archive search returns only articles, no flag (anti-trivial)', () => {
    const inputs = { q: 'Security' }
    const result = session.run(inputs)
    expect(result.rowCount).toBe(1) // matches "Quarterly Security Review"
    expect(evaluate(level.winCondition, toWinContext(result, inputs)).won).toBe(false)
  })

  it('NO WIN: sqlite_master discovery reveals the hidden table but is a non-terminal milestone', () => {
    // Discovery dumps CREATE statements (column names) but NOT row data, so the
    // flag (a value in the payload column) never surfaces here.
    const inputs = { q: "' UNION SELECT name, sql FROM sqlite_master -- " }
    const result = session.run(inputs)
    expect(result.error).toBeUndefined()
    expect(JSON.stringify(result.rows)).toContain(HIDDEN_TABLE) // table discovered
    expect(evaluate(level.winCondition, toWinContext(result, inputs)).won).toBe(false)
  })
})

describe('blueprint.json — column-count invariant: UNION = 2 columns (R4)', () => {
  it('ORDER BY 2 is accepted, ORDER BY 3 errors (2 projected columns)', () => {
    expect(session.run({ q: "' ORDER BY 2 -- " }).error).toBeUndefined()
    expect(session.run({ q: "' ORDER BY 3 -- " }).error).toBeDefined()
  })

  it('UNION SELECT with 2 NULLs is accepted, 3 NULLs errors', () => {
    expect(session.run({ q: "' UNION SELECT NULL, NULL -- " }).error).toBeUndefined()
    expect(session.run({ q: "' UNION SELECT NULL, NULL, NULL -- " }).error).toBeDefined()
  })
})

describe('blueprint.json — secure fix neutralizes the payload (PLAN §8)', () => {
  it('the parametrized LIKE reduces the winning payload to [] rows', async () => {
    const SQL = await loadSqlJs({ locateFile: () => wasmPath })
    const db = new SQL.Database()
    db.run(level.database.schemaSql)
    db.run(level.database.seedSql)

    // debrief.secureCode form: the pattern is BOUND; the UNION becomes plain text.
    const stmt = db.prepare('SELECT title, body FROM articles WHERE title LIKE ?')
    stmt.bind(['%' + level.expectedSolution.inputs.q + '%'])
    const rows: unknown[] = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    stmt.free()
    db.close()

    expect(rows).toEqual([])
  })
})
