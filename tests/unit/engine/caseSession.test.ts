import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createCaseEngine, type CaseEngine, type CaseSession } from '@/lib/engine/caseSession'
import { evaluate, toWinContext } from '@/lib/engine/winEvaluator'
import { parseCase } from '@/lib/schema/case'

// Proves the Model-A engine promise (docs/cases-design.md): one persistent DB
// across objectives, with a committed write from an earlier objective visible to a
// later one — and NO leak (deterministic restore) until it is committed.

const wasmPath = fileURLToPath(new URL('../../../public/sql-wasm.wasm', import.meta.url))

const debrief = {
  explanation: 'x',
  vulnerableCode: { language: 'js', code: 'x' },
  secureCode: { language: 'js', code: 'x' },
  takeaway: 'x',
}

const fixture = parseCase({
  schemaVersion: 1,
  id: 'test-vault',
  number: '999',
  title: 'Test Vault',
  briefing: { handler: 'The Fixer', text: 'test' },
  target: { appName: 'Test' },
  database: {
    schemaSql: 'CREATE TABLE door_acl (door TEXT, granted INTEGER)',
    seedSql: "INSERT INTO door_acl (door, granted) VALUES ('VAULT', 0), ('LOBBY', 1)",
    visibleSchema: [{ table: 'door_acl', columns: ['door', 'granted'] }],
  },
  objectives: [
    {
      id: 'flip',
      order: 1,
      goal: 'Flip the vault door open.',
      why: 'The loot is behind it.',
      doneWhen: 'An extra result set proves the stacked write ran.',
      technique: 'stacked-queries',
      difficulty: 'hard',
      surface: 'login-form',
      fields: [{ name: 'badge', label: 'Badge', type: 'text' }],
      query: { template: "SELECT door, granted FROM door_acl WHERE door = '{{input:badge}}'" },
      winCondition: { type: 'stacked-queries', minResultSets: 2, mustReference: ['UPDATE', 'VAULT'] },
      hints: [],
      expectedSolution: { inputs: {} },
      debrief,
    },
    {
      id: 'confirm',
      order: 2,
      goal: 'Confirm the vault reads OPEN.',
      why: 'Prove the door actually flipped.',
      doneWhen: 'The VAULT row comes back with granted = 1.',
      technique: 'union-extraction',
      difficulty: 'easy',
      surface: 'search-box',
      fields: [{ name: 'door', label: 'Door', type: 'text' }],
      query: { template: "SELECT door FROM door_acl WHERE granted = 1 AND door = '{{input:door}}'" },
      winCondition: { type: 'rows-returned', min: 1 },
      hints: [],
      expectedSolution: { inputs: {} },
      debrief,
    },
  ],
  caseClosed: { headline: 'DONE', fixer: 'Clean.' },
})

// The first read must match a row so it counts as a result set (sql.js drops
// 0-row sets); 'LOBBY' exists, so the badge read + the stacked verify SELECT = 2 sets.
const STACKED = {
  badge:
    "LOBBY'; UPDATE door_acl SET granted = 1 WHERE door = 'VAULT'; SELECT door, granted FROM door_acl WHERE door = 'VAULT' -- ",
}

let engine: CaseEngine
let session: CaseSession

beforeAll(async () => {
  engine = createCaseEngine({ locateFile: () => wasmPath })
  await engine.init()
  session = await engine.openCase(fixture)
})

afterAll(() => session?.dispose())

describe('caseSession — persistent DB across objectives (Model A)', () => {
  it('exposes the case shape (objectiveCount + visibleSchema)', () => {
    expect(session.objectiveCount).toBe(2)
    expect(session.visibleSchema[0].table).toBe('door_acl')
  })

  it('a committed stacked write in objective 0 is visible to objective 1', () => {
    session.reset()
    const r0 = session.runObjective(0, STACKED)
    expect(r0.error).toBeUndefined()
    expect(evaluate(fixture.objectives[0].winCondition, toWinContext(r0, STACKED)).won).toBe(true)

    session.commitObjective(0) // door now flipped for the next objective

    const r1 = session.runObjective(1, { door: 'VAULT' })
    expect(r1.rowCount).toBeGreaterThan(0) // VAULT.granted became 1 — the write carried forward
    expect(evaluate(fixture.objectives[1].winCondition, toWinContext(r1, { door: 'VAULT' })).won).toBe(true)
  })

  it('WITHOUT commit, objective 1 sees the initial state (deterministic restore, no leak)', () => {
    session.reset()
    session.runObjective(0, STACKED) // mutates the DB but is NOT committed
    const r1 = session.runObjective(1, { door: 'VAULT' })
    expect(r1.rowCount).toBe(0) // granted still 0 — the uncommitted write did not leak
  })
})
