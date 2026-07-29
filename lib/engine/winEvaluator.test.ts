import { describe, expect, it } from 'vitest'
import type { SqlCell, WinCondition } from '@/lib/schema/level'
import type { ExecutionResult } from '@/lib/engine/sqlRunner'
import { evaluate, toWinContext, type WinContext } from '@/lib/engine/winEvaluator'

function ctx(partial: Partial<WinContext> & { rows?: SqlCell[][] }): WinContext {
  const rows = partial.rows ?? []
  return {
    inputs: partial.inputs ?? {},
    composedSql: partial.composedSql ?? '',
    columns: partial.columns ?? [],
    rows,
    rowCount: partial.rowCount ?? rows.length,
    error: partial.error,
  }
}

describe('evaluate — rows-returned', () => {
  it('wins when rowCount meets min', () => {
    const cond: WinCondition = { type: 'rows-returned', min: 1 }
    const result = evaluate(cond, ctx({ columns: ['id'], rows: [[1]] }))
    expect(result.won).toBe(true)
    expect(result.reason.length).toBeGreaterThan(0)
  })

  it('loses when rowCount is below min', () => {
    const cond: WinCondition = { type: 'rows-returned', min: 1 }
    expect(evaluate(cond, ctx({ rows: [] })).won).toBe(false)
  })

  it('respects an upper max bound', () => {
    const cond: WinCondition = { type: 'rows-returned', min: 1, max: 1 }
    expect(evaluate(cond, ctx({ columns: ['id'], rows: [[1]] })).won).toBe(true)
    expect(evaluate(cond, ctx({ columns: ['id'], rows: [[1], [2]] })).won).toBe(false)
  })
})

describe('evaluate — flag-in-result', () => {
  const flag = 'LOOT-VAULT-9F2C4471'

  it('wins when the flag appears in any cell', () => {
    const cond: WinCondition = { type: 'flag-in-result', flag }
    const result = evaluate(
      cond,
      ctx({ columns: ['holder', 'ref', 'bal'], rows: [['Shell', flag, 5000000]] }),
    )
    expect(result.won).toBe(true)
  })

  it('loses when the flag is absent', () => {
    const cond: WinCondition = { type: 'flag-in-result', flag }
    expect(evaluate(cond, ctx({ columns: ['name'], rows: [['Widget']] })).won).toBe(false)
  })

  it('restricts the search to a named column when column is given', () => {
    const cond: WinCondition = { type: 'flag-in-result', flag, column: 'ref' }
    // flag sits in the "name" column, NOT "ref" -> no win
    expect(
      evaluate(cond, ctx({ columns: ['name', 'ref'], rows: [[flag, 'other']] })).won,
    ).toBe(false)
    // flag in the "ref" column -> win
    expect(
      evaluate(cond, ctx({ columns: ['name', 'ref'], rows: [['x', flag]] })).won,
    ).toBe(true)
  })

  it('is case-insensitive by default and case-sensitive when asked', () => {
    const lower: WinCondition = { type: 'flag-in-result', flag: 'loot-x' }
    expect(evaluate(lower, ctx({ columns: ['c'], rows: [['LOOT-X']] })).won).toBe(true)
    const strict: WinCondition = { type: 'flag-in-result', flag: 'loot-x', caseSensitive: true }
    expect(evaluate(strict, ctx({ columns: ['c'], rows: [['LOOT-X']] })).won).toBe(false)
  })

  it('matches a flag embedded as a substring of a larger cell', () => {
    const cond: WinCondition = { type: 'flag-in-result', flag: 'SECRET' }
    expect(evaluate(cond, ctx({ columns: ['c'], rows: [['prefix-SECRET-suffix']] })).won).toBe(true)
  })
})

describe('evaluate — row-match (subset vs exact, K6)', () => {
  it('subset: matches when the expected col=val pair is present, extra columns allowed', () => {
    const cond: WinCondition = { type: 'row-match', expect: [{ is_admin: 1 }], mode: 'subset' }
    const result = evaluate(
      cond,
      ctx({ columns: ['id', 'username', 'is_admin'], rows: [[1, 'admin', 1]] }),
    )
    expect(result.won).toBe(true)
  })

  it('subset: loses when the expected value does not match', () => {
    const cond: WinCondition = { type: 'row-match', expect: [{ is_admin: 1 }], mode: 'subset' }
    expect(
      evaluate(cond, ctx({ columns: ['id', 'is_admin'], rows: [[2, 0]] })).won,
    ).toBe(false)
  })

  it('exact: wins only on a 1:1 column match (no extra columns)', () => {
    const cond: WinCondition = {
      type: 'row-match',
      expect: [{ id: 1, is_admin: 1 }],
      mode: 'exact',
    }
    // exactly the two expected columns -> win
    expect(
      evaluate(cond, ctx({ columns: ['id', 'is_admin'], rows: [[1, 1]] })).won,
    ).toBe(true)
    // an extra "username" column breaks 1:1 -> no win
    expect(
      evaluate(
        cond,
        ctx({ columns: ['id', 'username', 'is_admin'], rows: [[1, 'admin', 1]] }),
      ).won,
    ).toBe(false)
  })

  it('wins when ANY expect entry matches ANY returned row', () => {
    const cond: WinCondition = {
      type: 'row-match',
      expect: [{ role: 'root' }, { is_admin: 1 }],
      mode: 'subset',
    }
    expect(
      evaluate(cond, ctx({ columns: ['username', 'is_admin'], rows: [['bob', 0], ['amy', 1]] }))
        .won,
    ).toBe(true)
  })
})

describe('toWinContext — bridges ExecutionResult + inputs', () => {
  it('carries the execution fields and the player inputs into the context', () => {
    const result: ExecutionResult = {
      composedSql: "SELECT 1 WHERE x = ''",
      columns: ['a'],
      rows: [[1]],
      rowCount: 1,
      durationMs: 2,
    }
    const context = toWinContext(result, { x: 'inj' })
    expect(context).toEqual({
      inputs: { x: 'inj' },
      composedSql: "SELECT 1 WHERE x = ''",
      columns: ['a'],
      rows: [[1]],
      rowCount: 1,
      error: undefined,
    })
    // durationMs is not part of the win context (§5.1)
    expect('durationMs' in context).toBe(false)
  })
})

describe('evaluate — anti-trivial guard (§5.3)', () => {
  it('empty/benign context (0 rows) never wins any DSL type', () => {
    const empty = ctx({ inputs: { username: '', password: '' }, rows: [] })
    expect(evaluate({ type: 'rows-returned', min: 1 }, empty).won).toBe(false)
    expect(evaluate({ type: 'flag-in-result', flag: 'LOOT' }, empty).won).toBe(false)
    expect(
      evaluate({ type: 'row-match', expect: [{ is_admin: 1 }], mode: 'subset' }, empty).won,
    ).toBe(false)
  })

  it('a SQLite error never counts as a win', () => {
    const errored = ctx({ error: 'near "OR": syntax error', rows: [] })
    expect(evaluate({ type: 'rows-returned', min: 0 }, errored).won).toBe(false)
    expect(evaluate({ type: 'flag-in-result', flag: 'LOOT' }, errored).won).toBe(false)
  })

  it('an empty flag cannot trivially win', () => {
    const cond: WinCondition = { type: 'flag-in-result', flag: '' }
    expect(evaluate(cond, ctx({ columns: ['c'], rows: [['anything']] })).won).toBe(false)
  })
})
