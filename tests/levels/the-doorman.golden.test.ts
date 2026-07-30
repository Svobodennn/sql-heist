import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createSqlEngine, type LevelSession, type SqlEngine } from '@/lib/engine/levelSession'
import { evaluate, toWinContext } from '@/lib/engine/winEvaluator'
import { compose } from '@/lib/engine/queryComposer'
import { deriveSignal } from '@/lib/engine/signal'
import { loadSqlJs } from '@/lib/engine/sqlLoader'
import { parseLevel } from '@/lib/schema/level'
import theDoormanJson from '@/content/levels/the-doorman.json'

// Golden test (docs/ws3-design.md, Act II): WAF-BYPASS. A keyword blocklist
// (reject mode) fronts a still-concatenated UNION extraction. Locks: the naive
// 'UNION SELECT' is REJECTED by the filter (blocked + errored, no win), the
// '/**/' comment-split bypass slips past the literal match and still extracts the
// loot (win), a benign search leaks nothing, and the parametrized fix => [].

const wasmPath = fileURLToPath(new URL('../../public/sql-wasm.wasm', import.meta.url))
const level = parseLevel(theDoormanJson)
const FLAG = 'LOOT-DOORMAN-5B1E9F0C'

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

describe('the-doorman.json — schema + WAF bypass', () => {
  it('validates against the canonical Level schema (with an inputFilter)', () => {
    expect(level.id).toBe('the-doorman')
    expect(level.order).toBe(8)
    expect(level.technique).toBe('waf-bypass')
    expect(level.winCondition).toMatchObject({ type: 'flag-in-result', flag: FLAG })
    expect(level.query.inputFilter).toMatchObject({
      mode: 'reject',
      blocklist: ['UNION SELECT', 'UNION ALL SELECT'],
    })
  })

  it('loot flag is single-sourced: it appears exactly once in the seed (K5)', () => {
    const occurrences = level.database.seedSql.split(FLAG).length - 1
    expect(occurrences).toBe(1)
  })

  it('FILTER BLOCKS: the naive UNION SELECT is rejected by the doorman (no win)', () => {
    const inputs = { q: "' UNION SELECT schematic, loot FROM archive_ledger -- " }
    const result = session.run(inputs)
    expect(result.filter).toBeDefined()
    expect(result.filter?.mode).toBe('reject')
    expect(result.filter?.blocked).toContain('UNION SELECT')
    expect(result.error).toBeDefined() // rejected before it ever reached the DB
    expect(evaluate(level.winCondition, toWinContext(result, inputs)).won).toBe(false)
  })

  it('BYPASS WINS: the /**/ comment-split slips past the filter and lifts the loot', () => {
    const result = session.run(solve)
    expect(result.filter).toBeDefined()
    expect(result.filter?.blocked).toEqual([]) // nothing matched the blocklist
    expect(result.error).toBeUndefined()
    expect(evaluate(level.winCondition, toWinContext(result, solve)).won).toBe(true)

    const sig = deriveSignal(level, composedFor(solve), result)
    expect(sig.kind).toBe('rows')
  })

  it('NO WIN: a benign archive search returns only notices, no loot (anti-trivial)', () => {
    const inputs = { q: 'Lobby' }
    const result = session.run(inputs)
    expect(result.filter?.blocked).toEqual([])
    expect(result.rowCount).toBe(1) // matches "Lobby Renovation"
    expect(evaluate(level.winCondition, toWinContext(result, inputs)).won).toBe(false)
  })

  it('secure fix: the parametrized LIKE reduces the bypass payload to [] rows', async () => {
    const SQL = await loadSqlJs({ locateFile: () => wasmPath })
    const db = new SQL.Database()
    db.run(level.database.schemaSql)
    db.run(level.database.seedSql)

    // debrief.secureCode form: the pattern is BOUND — the UNION becomes plain search
    // text, so the phrase never needs a filter at all (a WAF is not the fix).
    const stmt = db.prepare('SELECT title, body FROM notices WHERE title LIKE ?')
    stmt.bind(['%' + solve.q + '%'])
    const rows: unknown[] = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    stmt.free()
    db.close()

    expect(rows).toEqual([])
  })
})
