import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createSqlEngine, type LevelSession, type SqlEngine } from '@/lib/engine/levelSession'
import { evaluate, toWinContext } from '@/lib/engine/winEvaluator'
import { compose } from '@/lib/engine/queryComposer'
import { deriveSignal } from '@/lib/engine/signal'
import { loadSqlJs } from '@/lib/engine/sqlLoader'
import { parseLevel } from '@/lib/schema/level'
import theTellJson from '@/content/levels/the-tell.json'

// Golden test (docs/ws3-design.md, Act II): a BLIND boolean oracle against the
// FROZEN engine. The app leaks only one bit (row present / absent); the win pins
// a decisive bit of the hidden master PIN. Locks: solve => oracle TRUE (win), a
// benign code and a WRONG-bit guess => oracle FALSE (no win, proving the oracle
// reads the bit, not merely "any injection"), and the parametrized fix => [].

const wasmPath = fileURLToPath(new URL('../../public/sql-wasm.wasm', import.meta.url))
const level = parseLevel(theTellJson)

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

describe('the-tell.json — schema + blind boolean oracle', () => {
  it('validates against the canonical Level schema', () => {
    expect(level.id).toBe('the-tell')
    expect(level.order).toBe(4)
    expect(level.technique).toBe('blind-boolean')
    expect(level.winCondition.type).toBe('blind-boolean')
  })

  it('WIN: pinning the first PIN character (TRUE) makes the oracle return rows', () => {
    const result = session.run(solve)
    expect(result.error).toBeUndefined()
    expect(result.rowCount).toBeGreaterThan(0)
    expect(evaluate(level.winCondition, toWinContext(result, solve)).won).toBe(true)

    const sig = deriveSignal(level, composedFor(solve), result)
    expect(sig.kind).toBe('oracle')
    if (sig.kind !== 'oracle') throw new Error('expected oracle')
    expect(sig.value).toBe(true)
  })

  it('NO WIN: a benign reset code returns zero rows — oracle FALSE (anti-trivial)', () => {
    const inputs = { code: 'RC-0000' }
    const result = session.run(inputs)
    expect(result.rowCount).toBe(0)
    expect(evaluate(level.winCondition, toWinContext(result, inputs)).won).toBe(false)

    const sig = deriveSignal(level, composedFor(inputs), result)
    if (sig.kind !== 'oracle') throw new Error('expected oracle')
    expect(sig.value).toBe(false)
  })

  it('NO WIN: a WRONG-bit guess reads FALSE — the oracle discriminates on the PIN', () => {
    // Same injection shape as the solve, but guessing the first digit is '0'
    // (it is '7'). The subquery holds, the comparison fails, zero rows come back.
    const inputs = {
      code: "' OR (SELECT substr(master_pin,1,1) FROM vault_config WHERE id=1)='0' -- ",
    }
    const result = session.run(inputs)
    expect(result.error).toBeUndefined()
    expect(result.rowCount).toBe(0)
    expect(evaluate(level.winCondition, toWinContext(result, inputs)).won).toBe(false)
  })

  it('secure fix: the parametrized lookup reduces the oracle payload to [] rows', async () => {
    const SQL = await loadSqlJs({ locateFile: () => wasmPath })
    const db = new SQL.Database()
    db.run(level.database.schemaSql)
    db.run(level.database.seedSql)

    // debrief.secureCode form: code is BOUND, so the OR-subquery is just text to match.
    const stmt = db.prepare('SELECT id FROM reset_codes WHERE code = ?')
    stmt.bind([solve.code])
    const rows: unknown[] = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    stmt.free()
    db.close()

    expect(rows).toEqual([])
  })
})
