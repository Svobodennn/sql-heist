import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createSqlEngine, type LevelSession, type SqlEngine } from '@/lib/engine/levelSession'
import { evaluate, toWinContext } from '@/lib/engine/winEvaluator'
import { compose } from '@/lib/engine/queryComposer'
import { deriveSignal } from '@/lib/engine/signal'
import { loadSqlJs } from '@/lib/engine/sqlLoader'
import { parseLevel } from '@/lib/schema/level'
import theStopwatchJson from '@/content/levels/the-stopwatch.json'

// Golden test (docs/ws3-design.md, Act II): a BLIND TIMING oracle. Timing is
// MODELED symbolically (sql.js is synchronous) — the TRUE branch fires as a
// returned row and the meter reports the modeled slow delay. Locks: solve =>
// timing SLOW over the tuned threshold (win), a benign token and a
// clearance-that-does-not-exist probe => FAST/FALSE (no win), fix => [].

const wasmPath = fileURLToPath(new URL('../../public/sql-wasm.wasm', import.meta.url))
const level = parseLevel(theStopwatchJson)

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

afterAll(() => {
  session?.dispose()
})

describe('the-stopwatch.json — schema + blind timing oracle', () => {
  it('validates against the canonical Level schema (with tuned timing meter)', () => {
    expect(level.id).toBe('the-stopwatch')
    expect(level.order).toBe(5)
    expect(level.technique).toBe('blind-timing')
    expect(level.winCondition).toMatchObject({
      type: 'blind-timing',
      thresholdMs: 750,
      slowDelayMs: 3000,
    })
  })

  it('WIN: the OMEGA existence probe fires the slow branch (modeled slow over threshold)', () => {
    const result = session.run(solve)
    expect(result.error).toBeUndefined()
    expect(result.rowCount).toBeGreaterThan(0)
    expect(evaluate(level.winCondition, toWinContext(result, solve)).won).toBe(true)

    const sig = deriveSignal(level, composedFor(solve), result)
    expect(sig.kind).toBe('timing')
    if (sig.kind !== 'timing') throw new Error('expected timing')
    expect(sig.slow).toBe(true)
    expect(sig.delayMs).toBe(3000)
    expect(sig.threshold).toBe(750)
  })

  it('NO WIN: a benign token stays fast — timing FALSE (anti-trivial)', () => {
    const inputs = { token: 'sess-zzzz' }
    const result = session.run(inputs)
    expect(result.rowCount).toBe(0)
    expect(evaluate(level.winCondition, toWinContext(result, inputs)).won).toBe(false)

    const sig = deriveSignal(level, composedFor(inputs), result)
    if (sig.kind !== 'timing') throw new Error('expected timing')
    expect(sig.slow).toBe(false)
    expect(sig.delayMs).toBe(0)
  })

  it('NO WIN: probing a clearance that does not exist stays fast — the oracle discriminates', () => {
    const inputs = {
      token: "' OR (SELECT CASE WHEN COUNT(*)>0 THEN 1 ELSE 0 END FROM staff WHERE clearance='ZULU')=1 -- ",
    }
    const result = session.run(inputs)
    expect(result.error).toBeUndefined()
    expect(result.rowCount).toBe(0)
    expect(evaluate(level.winCondition, toWinContext(result, inputs)).won).toBe(false)
  })

  it('NO WIN: a blanket tautology (OR 1=1) returns rows but is NOT the timing oracle', () => {
    // Regression: rows come back, but the slow branch never hinged on the secret.
    // mustReference ['staff'] holds the win back until the payload interrogates it.
    const inputs = { token: "' OR 1=1 -- " }
    const result = session.run(inputs)
    expect(result.error).toBeUndefined()
    expect(result.rowCount).toBeGreaterThan(0)
    expect(evaluate(level.winCondition, toWinContext(result, inputs)).won).toBe(false)
  })

  it('secure fix: the parametrized lookup reduces the timing payload to [] rows', async () => {
    const SQL = await loadSqlJs({ locateFile: () => wasmPath })
    const db = new SQL.Database()
    db.run(level.database.schemaSql)
    db.run(level.database.seedSql)

    // debrief.secureCode form: token is BOUND, so the CASE-WHEN branch is just text.
    const stmt = db.prepare('SELECT id FROM sessions WHERE token = ?')
    stmt.bind([solve.token])
    const rows: unknown[] = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    stmt.free()
    db.close()

    expect(rows).toEqual([])
  })
})
