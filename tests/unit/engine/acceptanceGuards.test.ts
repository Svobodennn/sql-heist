import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { getCase } from '@/features/game/cases'
import { createCaseEngine, type CaseEngine } from '@/lib/engine/caseSession'
import { evaluate, toWinContext } from '@/lib/engine/winEvaluator'

// F1 acceptance-soundness guards (design review): a win must require the TECHNIQUE,
// not just a result-shape or an echoed literal. mustReference now guards flag-in-result
// too, and blind/stacked reference the source table — so the off-technique payloads the
// council-empiricist reproduced are rejected, while the authored solutions still win.

const wasmPath = fileURLToPath(new URL('../../../public/sql-wasm.wasm', import.meta.url))
let engine: CaseEngine

beforeAll(async () => {
  engine = createCaseEngine({ locateFile: () => wasmPath })
  await engine.init()
})

async function won(caseId: string, objId: string, inputs: Record<string, string>): Promise<boolean> {
  const gameCase = getCase(caseId)
  if (!gameCase) throw new Error(`no case ${caseId}`)
  const index = gameCase.objectives.findIndex((o) => o.id === objId)
  const objective = gameCase.objectives[index]
  const session = await engine.openCase(gameCase)
  try {
    const result = session.runObjective(index, inputs)
    return evaluate(objective.winCondition, toWinContext(result, inputs)).won
  } finally {
    session.dispose()
  }
}
const solutionOf = (caseId: string, objId: string) =>
  getCase(caseId)!.objectives.find((o) => o.id === objId)!.expectedSolution.inputs

describe('acceptance guards — off-technique payloads are rejected', () => {
  it('flag-in-result: echoing the flag as a literal loses; the real read wins', async () => {
    // BLOCKED: the flag string handed back as a constant, never reading sqlite_master.
    expect(await won('the-front-door', 'blueprint', { q: "' UNION SELECT 'offshore_accounts', 'x' -- " })).toBe(false)
    // WIN: the authored catalog read.
    expect(await won('the-front-door', 'blueprint', solutionOf('the-front-door', 'blueprint'))).toBe(true)
  })

  it('blind-boolean: a bare tautology loses; the oracle read wins', async () => {
    // BLOCKED: contains "master_pin" as a literal but never queries vault_config.
    expect(await won('the-quiet-room', 'the-tell', { code: "' OR 'master_pin'='master_pin' -- " })).toBe(false)
    // WIN: the authored yes/no oracle against the real column.
    expect(await won('the-quiet-room', 'the-tell', solutionOf('the-quiet-room', 'the-tell'))).toBe(true)
  })

  it('stacked-queries: SELECTing the keywords as literals loses; the real write wins', async () => {
    // BLOCKED: adds a result set + echoes "UPDATE"/the door id, but never touches door_acl.
    expect(
      await won('the-vault', 'the-double-tap', {
        badge: "x'; SELECT 'UPDATE', 'VLT-DOOR-3E9A' -- ",
      }),
    ).toBe(false)
    // WIN: the authored stacked UPDATE + verify read.
    expect(await won('the-vault', 'the-double-tap', solutionOf('the-vault', 'the-double-tap'))).toBe(true)
  })
})
