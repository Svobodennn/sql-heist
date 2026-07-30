import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { CASES } from '@/features/game/cases'
import { createCaseEngine, type CaseEngine } from '@/lib/engine/caseSession'
import { evaluate, toWinContext } from '@/lib/engine/winEvaluator'

// P3 content gate: every migrated objective still solves — now against its case's
// MERGED shared DB, played in order through the persistent case-session. Proves the
// DB merges are sound and the ported query/winCondition/expectedSolution are intact.

const wasmPath = fileURLToPath(new URL('../../public/sql-wasm.wasm', import.meta.url))
let engine: CaseEngine

beforeAll(async () => {
  engine = createCaseEngine({ locateFile: () => wasmPath })
  await engine.init()
})

describe.each(CASES)('case $number — $title', (gameCase) => {
  it('every objective carries goal / why / doneWhen', () => {
    for (const o of gameCase.objectives) {
      expect(o.goal.length, `${o.id}.goal`).toBeGreaterThan(0)
      expect(o.why.length, `${o.id}.why`).toBeGreaterThan(0)
      expect(o.doneWhen.length, `${o.id}.doneWhen`).toBeGreaterThan(0)
    }
  })

  it('plays through: each objective solves in order against the shared DB', async () => {
    const session = await engine.openCase(gameCase)
    try {
      gameCase.objectives.forEach((o, i) => {
        const result = session.runObjective(i, o.expectedSolution.inputs)
        const outcome = evaluate(o.winCondition, toWinContext(result, o.expectedSolution.inputs))
        expect(outcome.won, `objective ${i} (${o.id}) should solve — ${result.error ?? ''}`).toBe(true)
        session.commitObjective(i)
      })
    } finally {
      session.dispose()
    }
  })
})
