import { fileURLToPath } from 'node:url'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { evaluate, toWinContext } from '@/lib/engine/winEvaluator'
import { createSqlEngine, type SqlEngine } from '@/lib/engine/levelSession'
import {
  loginLevelFixture,
  searchLevelFixture,
  stackedQueriesLevelFixture,
} from '@/lib/engine/__fixtures__/levels'
import type { Level } from '@/lib/schema/level'

const wasmPath = fileURLToPath(new URL('../../public/sql-wasm.wasm', import.meta.url))

let engine: SqlEngine

beforeAll(async () => {
  engine = createSqlEngine({ locateFile: () => wasmPath })
  await engine.init()
})

describe('SqlEngine / LevelSession — fresh DB per level', () => {
  it('rejects openLevel before init()', async () => {
    const cold = createSqlEngine({ locateFile: () => wasmPath })
    await expect(cold.openLevel(loginLevelFixture())).rejects.toThrow()
  })

  it('exposes the level visibleSchema for the recon panel', async () => {
    const session = await engine.openLevel(loginLevelFixture())
    expect(session.visibleSchema).toEqual([{ table: 'users', columns: ['id', 'username', 'is_admin'] }])
    session.dispose()
  })

  it('returns a fresh copy of visibleSchema so a caller cannot mutate the level', async () => {
    const level = loginLevelFixture()
    const session = await engine.openLevel(level)

    const first = session.visibleSchema
    // A UI panel that sorts/mutates its copy must NOT poison the level or the
    // next read. Mutate both the outer array and a nested columns array.
    first.push({ table: 'injected', columns: ['x'] })
    first[0].columns.push('leaked')

    const second = session.visibleSchema
    expect(second).toEqual([{ table: 'users', columns: ['id', 'username', 'is_admin'] }])
    expect(second).not.toBe(first)
    // the level fixture itself is untouched
    expect(level.database.visibleSchema).toEqual([
      { table: 'users', columns: ['id', 'username', 'is_admin'] },
    ])
    session.dispose()
  })

  it('run() composes + execs: benign login returns 0 rows, injection returns the admin row', async () => {
    const session = await engine.openLevel(loginLevelFixture())
    const benign = session.run({ username: 'admin', password: 'wrong' })
    expect(benign.rowCount).toBe(0)

    const inject = session.run({ username: "' OR '1'='1' -- ", password: 'x' })
    expect(inject.rowCount).toBeGreaterThanOrEqual(1)
    expect(inject.composedSql).toContain("OR '1'='1'")
    session.dispose()
  })
})

describe('LevelSession — solvability + anti-trivial via the win evaluator (fixtures)', () => {
  it('login fixture: expectedSolution wins, benign input loses', async () => {
    const level = loginLevelFixture()
    const session = await engine.openLevel(level)

    const solvedInputs = level.expectedSolution.inputs
    const solved = session.run(solvedInputs)
    expect(evaluate(level.winCondition, toWinContext(solved, solvedInputs)).won).toBe(true)

    const benignInputs = { username: 'nobody', password: 'nope' }
    const benign = session.run(benignInputs)
    expect(evaluate(level.winCondition, toWinContext(benign, benignInputs)).won).toBe(false)
    session.dispose()
  })

  it('search fixture: UNION extraction surfaces the flag; benign search does not', async () => {
    const level = searchLevelFixture()
    const session = await engine.openLevel(level)

    const solvedInputs = level.expectedSolution.inputs
    const solved = session.run(solvedInputs)
    expect(evaluate(level.winCondition, toWinContext(solved, solvedInputs)).won).toBe(true)

    const benignInputs = { q: 'Widget' }
    const benign = session.run(benignInputs)
    expect(evaluate(level.winCondition, toWinContext(benign, benignInputs)).won).toBe(false)
    session.dispose()
  })
})

describe('LevelSession — WS3 stacked-queries end-to-end (real WASM)', () => {
  it('a stacked payload yields >=2 result sets and wins; benign login loses', async () => {
    const level = stackedQueriesLevelFixture()
    const session = await engine.openLevel(level)

    const solvedInputs = level.expectedSolution.inputs
    const solved = session.run(solvedInputs)
    expect(solved.error).toBeUndefined()
    expect(solved.resultSetCount).toBeGreaterThanOrEqual(2) // app query + stacked SELECT
    expect(evaluate(level.winCondition, toWinContext(solved, solvedInputs)).won).toBe(true)

    // A valid single-statement login returns one row => exactly 1 result set,
    // which is below the stacked threshold and loses.
    const benignInputs = { username: 'admin', password: 's3cr3t-fixture' }
    const benign = session.run(benignInputs)
    expect(benign.resultSetCount).toBe(1) // single statement
    expect(evaluate(level.winCondition, toWinContext(benign, benignInputs)).won).toBe(false)
    session.dispose()
  })
})

describe('LevelSession — WS3 inputFilter (WAF) short-circuits before the DB', () => {
  // Spread the search fixture and bolt a reject-mode WAF onto the query. This
  // exercises the engine wiring; a real bypass payload is content (P2) work.
  function wafLevel(): Level {
    const base = searchLevelFixture()
    return {
      ...base,
      technique: 'waf-bypass',
      query: {
        ...base.query,
        inputFilter: { blocklist: ['UNION'], mode: 'reject', message: 'The WAF dropped it.' },
      },
    }
  }

  it('rejects a blocklisted payload as an error result (never wins)', async () => {
    const level = wafLevel()
    const session = await engine.openLevel(level)

    const inputs = { q: "' UNION SELECT holder_name, account_ref, balance_usd FROM offshore_accounts -- " }
    const result = session.run(inputs)
    expect(result.error).toBe('The WAF dropped it.')
    expect(result.rowCount).toBe(0)
    expect(evaluate(level.winCondition, toWinContext(result, inputs)).won).toBe(false)
    session.dispose()
  })

  it('lets benign input through to the DB unchanged', async () => {
    const level = wafLevel()
    const session = await engine.openLevel(level)

    const result = session.run({ q: 'Widget' })
    expect(result.error).toBeUndefined()
    expect(result.rowCount).toBeGreaterThanOrEqual(1) // matches a seeded product
    session.dispose()
  })
})

describe('LevelSession.reset — destructive payload does not leak into the next attempt', () => {
  it('rebuilds a clean seeded DB after a DROP/DELETE payload', async () => {
    const level = loginLevelFixture()
    const session = await engine.openLevel(level)

    // Stacked destructive payload wipes the users table on THIS db.
    session.run({ username: "x'; DELETE FROM users; -- ", password: '' })
    const afterWipe = session.run({ username: "' OR '1'='1' -- ", password: 'x' })
    expect(afterWipe.rowCount).toBe(0) // data is gone on the tainted db

    session.reset()

    const winInputs = { username: "' OR '1'='1' -- ", password: 'x' }
    const afterReset = session.run(winInputs)
    expect(afterReset.rowCount).toBeGreaterThanOrEqual(1) // seed restored
    expect(evaluate(level.winCondition, toWinContext(afterReset, winInputs)).won).toBe(true)
    session.dispose()
  })
})

describe('LevelSession.dispose — lifecycle', () => {
  let disposedSession: Awaited<ReturnType<SqlEngine['openLevel']>>

  afterEach(() => {
    disposedSession?.dispose() // idempotent double-dispose must not throw
  })

  it('throws on run() after dispose', async () => {
    disposedSession = await engine.openLevel(loginLevelFixture())
    disposedSession.dispose()
    expect(() => disposedSession.run({ username: 'a', password: 'b' })).toThrow()
  })
})
