import { describe, expect, it } from 'vitest'
import type { ExecutionResult } from '@/lib/engine/sqlRunner'
import type { WinEvaluation } from '@/lib/engine/winEvaluator'
import { parseLevel } from '@/lib/schema/level'
import frontDoorJson from '@/content/levels/front-door.json'
import {
  canGoBack,
  makeInitialState,
  previousPhase,
  reducer,
  type GameState,
} from './phaseMachine'

const level = parseLevel(frontDoorJson)
const result = (over: Partial<ExecutionResult> = {}): ExecutionResult => ({
  composedSql: 'SELECT 1',
  columns: [],
  rows: [],
  rowCount: 0,
  durationMs: 1,
  ...over,
})
const won: WinEvaluation = { won: true, reason: 'in' }
const lost: WinEvaluation = { won: false, reason: 'nope' }

describe('phaseMachine.reducer', () => {
  const init = () => makeInitialState(level)

  it('starts in brief with empty inputs for each field', () => {
    const s = init()
    expect(s.phase).toBe('brief')
    expect(s.inputs).toEqual({ username: '', password: '' })
    expect(s.hintCount).toBe(level.hints.length)
  })

  it('ADVANCE walks brief -> recon -> exploit and then stops', () => {
    let s = init()
    s = reducer(s, { type: 'ADVANCE' })
    expect(s.phase).toBe('recon')
    s = reducer(s, { type: 'ADVANCE' })
    expect(s.phase).toBe('exploit')
    s = reducer(s, { type: 'ADVANCE' })
    expect(s.phase).toBe('exploit') // no forward from exploit via ADVANCE
  })

  it('BACK walks exploit -> recon -> brief and then stops', () => {
    let s: GameState = { ...init(), phase: 'exploit' }
    s = reducer(s, { type: 'BACK' })
    expect(s.phase).toBe('recon')
    s = reducer(s, { type: 'BACK' })
    expect(s.phase).toBe('brief')
    s = reducer(s, { type: 'BACK' })
    expect(s.phase).toBe('brief') // no back past brief
  })

  it('BACK preserves the session: inputs, attempts, hints and time survive', () => {
    let s: GameState = {
      ...init(),
      phase: 'exploit',
      failedRuns: 3,
      openedHintTiers: 2,
      elapsedSec: 42,
    }
    s = reducer(s, { type: 'SET_INPUT', field: 'username', value: "' OR 1=1 --" })
    const back = reducer(s, { type: 'BACK' })
    expect(back.phase).toBe('recon')
    expect(back.inputs.username).toBe("' OR 1=1 --")
    expect(back.failedRuns).toBe(3)
    expect(back.openedHintTiers).toBe(2)
    expect(back.elapsedSec).toBe(42)
    // ...and returning forward keeps everything, ready to resume the attempt.
    const forward = reducer(back, { type: 'ADVANCE' })
    expect(forward.phase).toBe('exploit')
    expect(forward.inputs.username).toBe("' OR 1=1 --")
    expect(forward.failedRuns).toBe(3)
  })

  it('BACK is a no-op from loot/debrief (post-win terminals)', () => {
    const loot: GameState = { ...init(), phase: 'loot' }
    expect(reducer(loot, { type: 'BACK' }).phase).toBe('loot')
    expect(canGoBack('loot')).toBe(false)
    expect(canGoBack('debrief')).toBe(false)
    expect(canGoBack('exploit')).toBe(true)
    expect(previousPhase('exploit')).toBe('recon')
    expect(previousPhase('brief')).toBeNull()
  })

  it('SET_INPUT only mutates during exploit', () => {
    let s = init()
    s = reducer(s, { type: 'SET_INPUT', field: 'username', value: 'x' })
    expect(s.inputs.username).toBe('') // ignored in brief
    s = { ...s, phase: 'exploit' }
    s = reducer(s, { type: 'SET_INPUT', field: 'username', value: "' OR 1=1 --" })
    expect(s.inputs.username).toBe("' OR 1=1 --")
  })

  it('a losing RUN increments failedRuns and stays in exploit', () => {
    const s: GameState = { ...init(), phase: 'exploit' }
    const next = reducer(s, { type: 'RUN', result: result(), evaluation: lost })
    expect(next.failedRuns).toBe(1)
    expect(next.phase).toBe('exploit')
    expect(next.score).toBeNull()
  })

  it('a winning RUN transitions to loot, freezes inputs and scores', () => {
    let s: GameState = { ...init(), phase: 'exploit' }
    s = reducer(s, { type: 'SET_INPUT', field: 'username', value: "' OR '1'='1' -- " })
    s = reducer(s, { type: 'RUN', result: result({ rowCount: 1 }), evaluation: won })
    expect(s.phase).toBe('loot')
    expect(s.winningInputs).toEqual({ username: "' OR '1'='1' -- ", password: '' })
    expect(s.score).not.toBeNull()
    expect([1, 2, 3]).toContain(s.stars)
  })

  it('OPEN_HINT enforces sequential unlock (1 -> 2 -> 3)', () => {
    let s = init()
    s = reducer(s, { type: 'OPEN_HINT', tier: 2 }) // cannot skip to 2 first
    expect(s.openedHintTiers).toBe(0)
    s = reducer(s, { type: 'OPEN_HINT', tier: 1 })
    expect(s.openedHintTiers).toBe(1)
    s = reducer(s, { type: 'OPEN_HINT', tier: 2 })
    expect(s.openedHintTiers).toBe(2)
  })

  it('TICK only advances the clock during exploit', () => {
    let s = init()
    s = reducer(s, { type: 'TICK' })
    expect(s.elapsedSec).toBe(0)
    s = reducer({ ...s, phase: 'exploit' }, { type: 'TICK' })
    expect(s.elapsedSec).toBe(1)
  })

  it('RESET_ATTEMPT clears the surface but keeps cumulative counters', () => {
    let s: GameState = { ...init(), phase: 'exploit', failedRuns: 4, openedHintTiers: 1 }
    s = reducer(s, { type: 'SET_INPUT', field: 'username', value: 'junk' })
    s = reducer(s, { type: 'RESET_ATTEMPT' })
    expect(s.inputs).toEqual({ username: '', password: '' })
    expect(s.failedRuns).toBe(4)
    expect(s.openedHintTiers).toBe(1)
  })
})
