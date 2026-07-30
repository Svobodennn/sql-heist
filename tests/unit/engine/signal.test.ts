import { describe, expect, it } from 'vitest'
import { compose } from '@/lib/engine/queryComposer'
import type { ExecutionResult } from '@/lib/engine/sqlRunner'
import type { Level, WinCondition } from '@/lib/schema/level'
import {
  DEFAULT_MODELED_SLOW_MS,
  DEFAULT_TIMING_THRESHOLD_MS,
  deriveSignal,
} from '@/lib/engine/signal'
import {
  loginLevelFixture,
  searchLevelFixture,
} from '@/lib/engine/__fixtures__/levels'

// deriveSignal is PURE — it only interprets what compose/exec already produced.
// Tests build a ComposedQuery via the (pure) composer and an ExecutionResult via
// a literal, so nothing here touches WASM. Levels are spread off the MVP fixtures
// and re-tagged; NO Act II real content is hardcoded (content owns those).

function execResult(partial: Partial<ExecutionResult>): ExecutionResult {
  const rows = partial.rows ?? []
  return {
    composedSql: partial.composedSql ?? '',
    columns: partial.columns ?? [],
    rows,
    rowCount: partial.rowCount ?? rows.length,
    error: partial.error,
    durationMs: partial.durationMs ?? 0,
    resultSetCount: partial.resultSetCount,
  }
}

function levelWith(technique: Level['technique'], winCondition: WinCondition): Level {
  return { ...loginLevelFixture(), technique, winCondition }
}

const dummyComposed = compose('SELECT 1', {})

describe('deriveSignal — rows (classic / union / auth + legacy MVP)', () => {
  it('row-match (auth) level yields a rows signal with the grid', () => {
    const level = loginLevelFixture() // technique auth-bypass, winCondition row-match
    const result = execResult({
      columns: ['id', 'username', 'is_admin'],
      rows: [[1, 'admin', 1]],
    })
    const sig = deriveSignal(level, dummyComposed, result)
    expect(sig.kind).toBe('rows')
    if (sig.kind !== 'rows') throw new Error('expected rows')
    expect(sig.columns).toEqual(['id', 'username', 'is_admin'])
    expect(sig.rows).toEqual([[1, 'admin', 1]])
  })

  it('flag-in-result (union) level yields a rows signal', () => {
    const level = searchLevelFixture()
    const sig = deriveSignal(
      level,
      dummyComposed,
      execResult({ columns: ['a'], rows: [['x']] }),
    )
    expect(sig.kind).toBe('rows')
  })

  it('a legacy MVP-shaped rows-returned level yields rows', () => {
    const level = levelWith('auth-bypass', { type: 'rows-returned', min: 1 })
    const sig = deriveSignal(level, dummyComposed, execResult({ columns: ['id'], rows: [[1]] }))
    expect(sig.kind).toBe('rows')
  })

  it('copies the grid (not the live result arrays)', () => {
    const result = execResult({ columns: ['id'], rows: [[1]] })
    const sig = deriveSignal(loginLevelFixture(), dummyComposed, result)
    if (sig.kind !== 'rows') throw new Error('expected rows')
    expect(sig.rows).toEqual(result.rows)
    expect(sig.rows).not.toBe(result.rows)
    expect(sig.rows[0]).not.toBe(result.rows[0])
  })

  it('an errored classic run still renders as an (empty) rows grid', () => {
    const sig = deriveSignal(
      loginLevelFixture(),
      dummyComposed,
      execResult({ error: 'near ")": syntax error' }),
    )
    expect(sig.kind).toBe('rows')
    if (sig.kind !== 'rows') throw new Error('expected rows')
    expect(sig.columns).toEqual([])
    expect(sig.rows).toEqual([])
  })
})

describe('deriveSignal — oracle (blind-boolean)', () => {
  const level = levelWith('blind-boolean', { type: 'blind-boolean' })

  it('rows present => oracle TRUE with a human basis', () => {
    const sig = deriveSignal(level, dummyComposed, execResult({ columns: ['x'], rows: [[1]] }))
    expect(sig.kind).toBe('oracle')
    if (sig.kind !== 'oracle') throw new Error('expected oracle')
    expect(sig.value).toBe(true)
    expect(sig.basis).toContain('TRUE')
  })

  it('zero rows => oracle FALSE', () => {
    const sig = deriveSignal(level, dummyComposed, execResult({ rows: [] }))
    if (sig.kind !== 'oracle') throw new Error('expected oracle')
    expect(sig.value).toBe(false)
    expect(sig.basis).toContain('FALSE')
  })

  it('an errored probe reads as FALSE (not a clean oracle answer)', () => {
    const sig = deriveSignal(level, dummyComposed, execResult({ error: 'boom', rows: [] }))
    if (sig.kind !== 'oracle') throw new Error('expected oracle')
    expect(sig.value).toBe(false)
    expect(sig.basis.length).toBeGreaterThan(0)
  })
})

describe('deriveSignal — timing (blind-timing, MODELED not wall-clock)', () => {
  const level = levelWith('blind-timing', { type: 'blind-timing' })

  it('time-branch fired (row present) => modeled slow delay over the threshold', () => {
    const sig = deriveSignal(level, dummyComposed, execResult({ columns: ['x'], rows: [[1]] }))
    expect(sig.kind).toBe('timing')
    if (sig.kind !== 'timing') throw new Error('expected timing')
    expect(sig.delayMs).toBe(DEFAULT_MODELED_SLOW_MS)
    expect(sig.threshold).toBe(DEFAULT_TIMING_THRESHOLD_MS)
    expect(sig.slow).toBe(true)
  })

  it('time-branch did not fire (0 rows) => fast, under the threshold', () => {
    const sig = deriveSignal(level, dummyComposed, execResult({ rows: [] }))
    if (sig.kind !== 'timing') throw new Error('expected timing')
    expect(sig.delayMs).toBe(0)
    expect(sig.slow).toBe(false)
  })

  it('is MODELED: ignores wall-clock durationMs entirely', () => {
    const sig = deriveSignal(
      level,
      dummyComposed,
      execResult({ columns: ['x'], rows: [[1]], durationMs: 9999 }),
    )
    if (sig.kind !== 'timing') throw new Error('expected timing')
    expect(sig.delayMs).toBe(DEFAULT_MODELED_SLOW_MS)
    expect(sig.delayMs).not.toBe(9999)
  })

  it('is deterministic: same input => same delayMs', () => {
    const result = execResult({ columns: ['x'], rows: [[1]], durationMs: 3 })
    const a = deriveSignal(level, dummyComposed, result)
    const b = deriveSignal(level, dummyComposed, execResult({ columns: ['x'], rows: [[1]], durationMs: 777 }))
    if (a.kind !== 'timing' || b.kind !== 'timing') throw new Error('expected timing')
    expect(a.delayMs).toBe(b.delayMs)
  })

  it('honors per-level thresholdMs / slowDelayMs overrides', () => {
    const tuned = levelWith('blind-timing', { type: 'blind-timing', thresholdMs: 500, slowDelayMs: 800 })
    const sig = deriveSignal(tuned, dummyComposed, execResult({ columns: ['x'], rows: [[1]] }))
    if (sig.kind !== 'timing') throw new Error('expected timing')
    expect(sig.delayMs).toBe(800)
    expect(sig.threshold).toBe(500)
    expect(sig.slow).toBe(true)
  })
})

describe('deriveSignal — error (error-based, honest-illustrative)', () => {
  it('passes the error message through and leaks the targeted token when present', () => {
    const level = levelWith('error-based', { type: 'error-based', errorContains: 'offshore_accounts' })
    const sig = deriveSignal(
      level,
      dummyComposed,
      execResult({ error: 'no such column: offshore_accounts.secret' }),
    )
    expect(sig.kind).toBe('error')
    if (sig.kind !== 'error') throw new Error('expected error')
    expect(sig.message).toBe('no such column: offshore_accounts.secret')
    expect(sig.leaked).toBe('offshore_accounts')
  })

  it('does NOT claim a leak when the targeted token is absent from the message', () => {
    const level = levelWith('error-based', { type: 'error-based', errorContains: 'offshore_accounts' })
    const sig = deriveSignal(level, dummyComposed, execResult({ error: 'near ")": syntax error' }))
    if (sig.kind !== 'error') throw new Error('expected error')
    expect(sig.message).toBe('near ")": syntax error')
    expect(sig.leaked).toBeUndefined()
  })

  it('no errorContains => no leaked token, message still passes through', () => {
    const level = levelWith('error-based', { type: 'error-based' })
    const sig = deriveSignal(level, dummyComposed, execResult({ error: 'datatype mismatch' }))
    if (sig.kind !== 'error') throw new Error('expected error')
    expect(sig.message).toBe('datatype mismatch')
    expect(sig.leaked).toBeUndefined()
  })
})

describe('deriveSignal — side-effect (stacked-queries)', () => {
  const level = levelWith('stacked-queries', { type: 'stacked-queries' })

  it('counts the stacked statements from the composed payload + summarizes', () => {
    const composed = compose(
      loginLevelFixture().query.template,
      { username: "admin'; SELECT 'PWNED' AS pwn; -- ", password: 'x' },
    )
    const sig = deriveSignal(level, composed, execResult({ columns: ['pwn'], rows: [['PWNED']], resultSetCount: 2 }))
    expect(sig.kind).toBe('side-effect')
    if (sig.kind !== 'side-effect') throw new Error('expected side-effect')
    expect(sig.statements).toBe(2)
    expect(sig.summary.length).toBeGreaterThan(0)
  })

  it('counts a DESTRUCTIVE stack even when it surfaces no extra result set', () => {
    // A DELETE produces no result set (resultSetCount stays 1), but the payload
    // DID run 2 statements — the count comes from the composed SQL, not the grid.
    const composed = compose(
      loginLevelFixture().query.template,
      { username: "x'; DELETE FROM users; -- ", password: '' },
    )
    const sig = deriveSignal(level, composed, execResult({ rows: [], resultSetCount: 1 }))
    if (sig.kind !== 'side-effect') throw new Error('expected side-effect')
    expect(sig.statements).toBe(2)
  })

  it('a benign single statement => statements 1, no side effect', () => {
    const composed = compose(loginLevelFixture().query.template, { username: 'admin', password: 's3cr3t' })
    const sig = deriveSignal(level, composed, execResult({ columns: ['id'], rows: [[1]], resultSetCount: 1 }))
    if (sig.kind !== 'side-effect') throw new Error('expected side-effect')
    expect(sig.statements).toBe(1)
  })

  it('an errored stacked payload is summarized as a failure', () => {
    const composed = compose(loginLevelFixture().query.template, { username: "a'; bogus; -- ", password: '' })
    const sig = deriveSignal(level, composed, execResult({ error: 'near "bogus": syntax error' }))
    if (sig.kind !== 'side-effect') throw new Error('expected side-effect')
    expect(sig.summary.toLowerCase()).toContain('error')
  })
})

describe('deriveSignal — purity', () => {
  it('does not mutate the execution result', () => {
    const result = execResult({ columns: ['id'], rows: [[1]] })
    const snapshot = JSON.stringify(result)
    deriveSignal(loginLevelFixture(), dummyComposed, result)
    expect(JSON.stringify(result)).toBe(snapshot)
  })
})
