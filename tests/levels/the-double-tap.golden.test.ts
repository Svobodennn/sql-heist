import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createSqlEngine, type LevelSession, type SqlEngine } from '@/lib/engine/levelSession'
import { evaluate, toWinContext } from '@/lib/engine/winEvaluator'
import { compose } from '@/lib/engine/queryComposer'
import { deriveSignal } from '@/lib/engine/signal'
import { loadSqlJs } from '@/lib/engine/sqlLoader'
import { parseLevel } from '@/lib/schema/level'
import theDoubleTapJson from '@/content/levels/the-double-tap.json'

// Golden test (docs/ws3-design.md, Act II): STACKED QUERIES. The batch runs the
// app's read, an injected UPDATE (the side effect), and a verify SELECT — two
// row-producing statements => an extra result set surfaces (the win signal).
// Locks: solve => resultSetCount >= 2 (win) AND the vault door actually flips to
// granted=1; a plain badge runs one statement and changes nothing; an errored
// stack never wins; binding + single-statement execution neutralizes the payload.
// Each run RESETS the DB (the UPDATE mutates state) so tests stay independent.

const wasmPath = fileURLToPath(new URL('../../public/sql-wasm.wasm', import.meta.url))
const level = parseLevel(theDoubleTapJson)

const solve = level.expectedSolution.inputs
const composedFor = (inputs: Record<string, string>) =>
  compose(level.query.template, inputs, level.query.inputFilter)

let engine: SqlEngine
let session: LevelSession

beforeAll(async () => {
  engine = createSqlEngine({ locateFile: () => wasmPath })
  await engine.init()
  session = await engine.openLevel(level)
})

beforeEach(() => {
  session.reset() // the UPDATE mutates the DB — start every case from a fresh seed
})

afterAll(() => {
  session?.dispose()
})

describe('the-double-tap.json — schema + stacked queries', () => {
  it('validates against the canonical Level schema', () => {
    expect(level.id).toBe('the-double-tap')
    expect(level.order).toBe(7)
    expect(level.technique).toBe('stacked-queries')
    expect(level.winCondition).toMatchObject({ type: 'stacked-queries', minResultSets: 2 })
  })

  it('WIN: the stacked UPDATE flips the vault door and surfaces an extra result set', () => {
    const result = session.run(solve)
    expect(result.error).toBeUndefined()
    expect(result.resultSetCount).toBe(2)
    expect(evaluate(level.winCondition, toWinContext(result, solve)).won).toBe(true)

    // Side effect OBSERVED: the trailing verify SELECT (last result set) reads the
    // vault door back as granted=1 — the injected UPDATE landed.
    expect(result.rows).toEqual([['VAULT', 1]])

    const sig = deriveSignal(level, composedFor(solve), result)
    expect(sig.kind).toBe('side-effect')
    if (sig.kind !== 'side-effect') throw new Error('expected side-effect')
    expect(sig.statements).toBeGreaterThanOrEqual(2)
  })

  it('NO WIN: a plain badge runs one statement and changes nothing (anti-trivial)', () => {
    const inputs = { badge: 'B-1001' }
    const result = session.run(inputs)
    expect(result.error).toBeUndefined()
    expect(result.resultSetCount).toBe(1)
    expect(evaluate(level.winCondition, toWinContext(result, inputs)).won).toBe(false)

    // The vault door is still locked — no side effect from a benign read.
    const vault = result.rows.find((r) => r[0] === 'VAULT')
    expect(vault?.[1]).toBe(0)
  })

  it('NO WIN: an errored stacked payload never wins (anti-trivial guard)', () => {
    const inputs = { badge: "B-1001'; DROP TABLE nope; -- " }
    const result = session.run(inputs)
    expect(result.error).toBeDefined()
    expect(evaluate(level.winCondition, toWinContext(result, inputs)).won).toBe(false)

    const sig = deriveSignal(level, composedFor(inputs), result)
    if (sig.kind !== 'side-effect') throw new Error('expected side-effect')
    expect(sig.summary.toLowerCase()).toContain('error')
  })

  it('secure fix: binding + single-statement execution neutralizes the payload', async () => {
    const SQL = await loadSqlJs({ locateFile: () => wasmPath })
    const db = new SQL.Database()
    db.run(level.database.schemaSql)
    db.run(level.database.seedSql)

    // debrief.secureCode form: the whole payload is a BOUND badge value; prepare()
    // runs a single statement, so the ';' UPDATE never executes.
    const stmt = db.prepare('SELECT door, granted FROM door_acl WHERE badge = ?')
    stmt.bind([solve.badge])
    const rows: unknown[] = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    stmt.free()

    expect(rows).toEqual([]) // no badge equals that giant literal string

    // ...and the vault door was never touched.
    const check = db.exec("SELECT granted FROM door_acl WHERE door = 'VAULT'")
    expect(check[0].values[0][0]).toBe(0)
    db.close()
  })
})
