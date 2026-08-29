import { describe, expect, it } from 'vitest'
import { compose } from '@/lib/engine/queryComposer'
import type { RunResult } from '@/lib/engine/sqlRunner'
import type { RunSignal } from '@/lib/engine/signal'
import {
  createObjectiveReceipt,
  retainFirstObjectiveReceipt,
} from '@/features/game/components/CasePlayer/objectiveReceipt'

function resultFor(composedSql: string, value = 'admin'): RunResult {
  return {
    composedSql,
    columns: ['username'],
    rows: [[value]],
    rowCount: 1,
    durationMs: 2,
  }
}

describe('objective winning receipts', () => {
  it('captures detached input, composed-query, result, and signal copies from one run', () => {
    const inputs = { username: "' OR 1=1 -- " }
    const composed = compose("SELECT username FROM users WHERE username = '{{input:username}}'", inputs)
    const result = resultFor(composed.sql)
    const signal: RunSignal = { kind: 'rows', columns: ['username'], rows: [['admin']] }

    const receipt = createObjectiveReceipt(inputs, composed, result, signal)
    inputs.username = 'changed'
    result.columns.push('mutated')
    ;(result.rows[0] as string[]).push('mutated')
    signal.columns.push('mutated')

    expect(receipt.inputs.username).toBe("' OR 1=1 -- ")
    expect(receipt.composed.sql).toBe(receipt.result.composedSql)
    expect(receipt.result.columns).toEqual(['username'])
    expect(receipt.result.rows).toEqual([['admin']])
    expect(receipt.signal).toEqual({ kind: 'rows', columns: ['username'], rows: [['admin']] })
  })

  it('records the WAF-effective SQL while retaining the player’s raw move', () => {
    const inputs = { q: "' UNION SELECT secret -- " }
    const composed = compose("SELECT name FROM products WHERE name = '{{input:q}}'", inputs, {
      mode: 'strip',
      blocklist: ['UNION'],
    })
    const result = { ...resultFor(composed.sql, 'safe'), filter: composed.filter }
    const signal: RunSignal = { kind: 'rows', columns: ['name'], rows: [['safe']] }

    const receipt = createObjectiveReceipt(inputs, composed, result, signal)

    expect(receipt.inputs.q).toContain('UNION')
    expect(receipt.composed.sql).not.toContain('UNION')
    expect(receipt.composed.sql).toBe(receipt.result.composedSql)
    expect(receipt.result.filter?.effectiveInput).not.toContain('UNION')
  })

  it('keeps the first winning receipt at the stable objective id', () => {
    const firstComposed = compose('SELECT {{input:q}}', { q: '1' })
    const secondComposed = compose('SELECT {{input:q}}', { q: '2' })
    const first = createObjectiveReceipt(
      { q: '1' },
      firstComposed,
      resultFor(firstComposed.sql, 'first'),
      { kind: 'rows', columns: ['q'], rows: [['first']] },
    )
    const second = createObjectiveReceipt(
      { q: '2' },
      secondComposed,
      resultFor(secondComposed.sql, 'second'),
      { kind: 'rows', columns: ['q'], rows: [['second']] },
    )

    const stored = retainFirstObjectiveReceipt({}, 'objective-stable-id', first)
    const rerun = retainFirstObjectiveReceipt(stored, 'objective-stable-id', second)

    expect(rerun).toBe(stored)
    expect(rerun['objective-stable-id']).toBe(first)
  })

  it('rejects a receipt assembled from different executions', () => {
    const composed = compose('SELECT {{input:q}}', { q: '1' })

    expect(() =>
      createObjectiveReceipt(
        { q: '1' },
        composed,
        resultFor('SELECT 2'),
        { kind: 'rows', columns: [], rows: [] },
      ),
    ).toThrow(/same execution/i)
  })
})
