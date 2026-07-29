import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createSqlEngine, type LevelSession, type SqlEngine } from '@/lib/engine/levelSession'
import { evaluate, toWinContext } from '@/lib/engine/winEvaluator'
import { loadSqlJs } from '@/lib/engine/sqlLoader'
import { parseLevel } from '@/lib/schema/level'
import frontDoorJson from '@/content/levels/front-door.json'

// Golden test (docs/PLAN.md §8): load the REAL level JSON through the FROZEN
// engine, prove the canonical payload wins, that benign logins never win, and
// that the parametrized secure form (debrief.secureCode) reduces the SAME
// payload to [] rows. parseLevel() doubles as the Zod build/validation gate.

const wasmPath = fileURLToPath(new URL('../../public/sql-wasm.wasm', import.meta.url))
const level = parseLevel(frontDoorJson)

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

describe('front-door.json — schema + golden payload', () => {
  it('validates against the canonical Level schema', () => {
    expect(level.id).toBe('front-door')
    expect(level.technique).toBe('auth-bypass')
    expect(level.query.template).not.toContain('role') // R7: no role column
    expect(level.winCondition).toMatchObject({ type: 'row-match', mode: 'subset' })
  })

  it('WIN: the expectedSolution injection surfaces the admin (is_admin=1) row', () => {
    const inputs = level.expectedSolution.inputs
    const result = session.run(inputs)
    expect(result.error).toBeUndefined()
    expect(evaluate(level.winCondition, toWinContext(result, inputs)).won).toBe(true)
  })

  it('NO WIN: a valid non-admin login returns a row but never wins', () => {
    // Legit credentials for j.marlow (is_admin=0): a row comes back, yet the
    // row-match win requires is_admin=1 — proves the guard is on the flag, not
    // merely on "any row returned".
    const inputs = { username: 'j.marlow', password: 'hunter2' }
    const result = session.run(inputs)
    expect(result.rowCount).toBe(1)
    expect(evaluate(level.winCondition, toWinContext(result, inputs)).won).toBe(false)
  })

  it('NO WIN: benign wrong credentials return zero rows (anti-trivial)', () => {
    const inputs = { username: 'admin', password: 'wrong' }
    const result = session.run(inputs)
    expect(result.rowCount).toBe(0)
    expect(evaluate(level.winCondition, toWinContext(result, inputs)).won).toBe(false)
  })
})

describe('front-door.json — secure fix neutralizes the payload (PLAN §8)', () => {
  it('the parametrized query reduces the winning payload to [] rows', async () => {
    const SQL = await loadSqlJs({ locateFile: () => wasmPath })
    const db = new SQL.Database()
    db.run(level.database.schemaSql)
    db.run(level.database.seedSql)

    // debrief.secureCode form: values are BOUND, not concatenated.
    const stmt = db.prepare(
      'SELECT id, username, is_admin FROM users WHERE username = ? AND password = ?',
    )
    stmt.bind([level.expectedSolution.inputs.username, level.expectedSolution.inputs.password])
    const rows: unknown[] = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    stmt.free()
    db.close()

    expect(rows).toEqual([])
  })
})
