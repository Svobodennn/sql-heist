import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createSqlEngine, type LevelSession, type SqlEngine } from '@/lib/engine/levelSession'
import { evaluate, toWinContext } from '@/lib/engine/winEvaluator'
import { compose } from '@/lib/engine/queryComposer'
import { deriveSignal } from '@/lib/engine/signal'
import { loadSqlJs } from '@/lib/engine/sqlLoader'
import { parseLevel } from '@/lib/schema/level'
import theConfessionJson from '@/content/levels/the-confession.json'

// Golden test (docs/ws3-design.md, Act II): ERROR-BASED, honest-illustrative.
// The INSERT is concatenated AND the raw DB error is user-visible. A duplicate
// trips SQLite's UNIQUE constraint, whose message names the hidden table.column.
// Locks: solve => error names promo_claims (win + leaked token), a fresh callsign
// => no error (no win), a DIFFERENT error is not the targeted confession, and
// binding stores an injection-shaped value as inert data. Each run RESETS the DB
// (the INSERT mutates state) so the tests stay order-independent.

const wasmPath = fileURLToPath(new URL('../../public/sql-wasm.wasm', import.meta.url))
const level = parseLevel(theConfessionJson)
const HIDDEN_TABLE = 'promo_claims'

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
  session.reset() // the INSERT mutates the DB — start every case from a fresh seed
})

afterAll(() => {
  session?.dispose()
})

describe('the-confession.json — schema + error-based leak', () => {
  it('validates against the canonical Level schema', () => {
    expect(level.id).toBe('the-confession')
    expect(level.order).toBe(6)
    expect(level.technique).toBe('error-based')
    expect(level.winCondition).toMatchObject({ type: 'error-based', errorContains: HIDDEN_TABLE })
  })

  it('hides the claims table from recon: seeded but NOT in visibleSchema', () => {
    expect(level.database.schemaSql).toContain(HIDDEN_TABLE)
    expect(level.database.visibleSchema.some((t) => t.table === HIDDEN_TABLE)).toBe(false)
  })

  it('WIN: a duplicate callsign forces a UNIQUE error that names the hidden table', () => {
    const result = session.run(solve)
    expect(result.error).toBeDefined()
    expect(result.error).toContain(HIDDEN_TABLE)
    expect(evaluate(level.winCondition, toWinContext(result, solve)).won).toBe(true)

    const sig = deriveSignal(level, composedFor(solve), result)
    expect(sig.kind).toBe('error')
    if (sig.kind !== 'error') throw new Error('expected error')
    expect(sig.leaked).toBe(HIDDEN_TABLE)
  })

  it('NO WIN: a fresh callsign inserts cleanly — no error, nothing leaked (anti-trivial)', () => {
    const inputs = { callsign: 'NOVA-77' }
    const result = session.run(inputs)
    expect(result.error).toBeUndefined()
    expect(evaluate(level.winCondition, toWinContext(result, inputs)).won).toBe(false)
  })

  it('NO WIN: a different error is not the targeted confession (errorContains scoping)', () => {
    // A value-count mismatch DOES error, but the message never names the table.
    const inputs = { callsign: "x', 'extra" }
    const result = session.run(inputs)
    expect(result.error).toBeDefined()
    expect(result.error).not.toContain(HIDDEN_TABLE)
    expect(evaluate(level.winCondition, toWinContext(result, inputs)).won).toBe(false)

    const sig = deriveSignal(level, composedFor(inputs), result)
    if (sig.kind !== 'error') throw new Error('expected error')
    expect(sig.leaked).toBeUndefined()
  })

  it('secure fix: binding stores an injection-shaped callsign as inert data (no leak)', async () => {
    const SQL = await loadSqlJs({ locateFile: () => wasmPath })
    const db = new SQL.Database()
    db.run(level.database.schemaSql)
    db.run(level.database.seedSql)

    // debrief.secureCode form: the value is BOUND, so the injection payload becomes
    // a literal callsign — it inserts cleanly with no error and no schema disclosure.
    const stmt = db.prepare('INSERT INTO promo_claims (callsign) VALUES (?)')
    expect(() => {
      stmt.bind(["NOVA', 'x"])
      stmt.step()
    }).not.toThrow()
    stmt.free()
    db.close()
  })
})
