import { describe, expect, it } from 'vitest'
import type { RunSignal } from '@/lib/engine/signal'
import type { FilterOutcome } from '@/lib/engine/queryComposer'
import {
  SIGNAL_TITLES,
  errorSpans,
  errorView,
  filterBanner,
  isRowsSignal,
  oracleView,
  sideEffectView,
  timingView,
} from './signalView'

// Synthetic RunSignal fixtures — the panel is built + tested against these, never
// against real Act II level JSON (authored in a parallel track).

describe('signal → panel mapping', () => {
  it('titles every RunSignal kind (the switch is total)', () => {
    const kinds: RunSignal['kind'][] = ['rows', 'oracle', 'timing', 'error', 'side-effect']
    for (const kind of kinds) expect(SIGNAL_TITLES[kind]).toBeTruthy()
  })

  it('isRowsSignal narrows the classic grid path (and tolerates null)', () => {
    const rows: RunSignal = { kind: 'rows', columns: ['id'], rows: [[1]] }
    expect(isRowsSignal(rows)).toBe(true)
    expect(isRowsSignal({ kind: 'oracle', value: true, basis: 'x' })).toBe(false)
    expect(isRowsSignal(null)).toBe(false)
  })
})

describe('oracleView (jade TRUE / crimson FALSE — never color-only)', () => {
  it('TRUE reads jade/defense with the word and basis', () => {
    const v = oracleView({ kind: 'oracle', value: true, basis: '1 row(s) — held TRUE.' })
    expect(v.word).toBe('TRUE')
    expect(v.tone).toBe('defense')
    expect(v.basis).toBe('1 row(s) — held TRUE.')
    expect(v.ariaLabel).toContain('TRUE')
    expect(v.ariaLabel).toContain('held TRUE')
  })

  it('FALSE reads crimson/attack with the word carried into the aria label', () => {
    const v = oracleView({ kind: 'oracle', value: false, basis: 'Zero rows — FALSE.' })
    expect(v.word).toBe('FALSE')
    expect(v.tone).toBe('attack')
    expect(v.ariaLabel.startsWith('Oracle answered FALSE')).toBe(true)
  })
})

describe('timingView (relative meter, slow=crimson)', () => {
  it('a fired slow branch overshoots the threshold marker and reads crimson', () => {
    const v = timingView({ kind: 'timing', delayMs: 2500, slow: true, threshold: 1000 })
    expect(v.slow).toBe(true)
    expect(v.word).toBe('slow')
    expect(v.tone).toBe('attack')
    // full-scale = max(1000,2500)*1.2 = 3000 -> fill 83.3%, marker 33.3%
    expect(v.fillPct).toBeGreaterThan(v.thresholdPct)
    expect(Math.round(v.fillPct)).toBe(83)
    expect(Math.round(v.thresholdPct)).toBe(33)
  })

  it('a fast (unfired) branch leaves the bar short of the marker and stays neutral', () => {
    const v = timingView({ kind: 'timing', delayMs: 0, slow: false, threshold: 1000 })
    expect(v.tone).toBe('neutral')
    expect(v.word).toBe('fast')
    expect(v.fillPct).toBe(0)
    expect(v.thresholdPct).toBeGreaterThan(0)
    expect(v.thresholdPct).toBeLessThan(v.thresholdPct + 1) // sanity: finite
  })

  it('clamps to 0..100 and never divides by zero', () => {
    const v = timingView({ kind: 'timing', delayMs: 0, slow: false, threshold: 0 })
    expect(v.fillPct).toBeGreaterThanOrEqual(0)
    expect(v.fillPct).toBeLessThanOrEqual(100)
    expect(v.thresholdPct).toBeGreaterThanOrEqual(0)
    expect(v.thresholdPct).toBeLessThanOrEqual(100)
  })
})

describe('errorSpans (highlight the leaked token as escaped text)', () => {
  it('returns one plain span when nothing leaked', () => {
    expect(errorSpans('no such column: xyz')).toEqual([{ text: 'no such column: xyz', leaked: false }])
  })

  it('returns one plain span when the token is absent from the message', () => {
    expect(errorSpans('syntax error', 'secret_col')).toEqual([
      { text: 'syntax error', leaked: false },
    ])
  })

  it('splits around the leaked token, preserving surrounding text', () => {
    const spans = errorSpans('no such column: admin_ssn here', 'admin_ssn')
    expect(spans).toEqual([
      { text: 'no such column: ', leaked: false },
      { text: 'admin_ssn', leaked: true },
      { text: ' here', leaked: false },
    ])
    expect(spans.map((s) => s.text).join('')).toBe('no such column: admin_ssn here')
  })

  it('highlights every occurrence and drops no text at the boundaries', () => {
    const spans = errorSpans('tok mid tok', 'tok')
    expect(spans.filter((s) => s.leaked)).toHaveLength(2)
    expect(spans.map((s) => s.text).join('')).toBe('tok mid tok')
    expect(spans.every((s) => s.text.length > 0)).toBe(true)
  })

  it('errorView marks the leaked token in the aria label', () => {
    const v = errorView({ kind: 'error', message: 'no such column: pw_hash', leaked: 'pw_hash' })
    expect(v.tone).toBe('attack')
    expect(v.leaked).toBe('pw_hash')
    expect(v.spans.some((s) => s.leaked && s.text === 'pw_hash')).toBe(true)
    expect(v.ariaLabel).toContain('leaked')
  })
})

describe('sideEffectView', () => {
  it('marks a landed stacked side effect (>=2 statements) crimson', () => {
    const v = sideEffectView({
      kind: 'side-effect',
      statements: 2,
      summary: '2 statements executed — its side effect landed.',
    })
    expect(v.landed).toBe(true)
    expect(v.tone).toBe('attack')
    expect(v.ariaLabel).toContain('2 statements executed')
  })

  it('a single statement stays neutral (nothing stacked)', () => {
    const v = sideEffectView({
      kind: 'side-effect',
      statements: 1,
      summary: 'A single statement ran — no side effect.',
    })
    expect(v.landed).toBe(false)
    expect(v.tone).toBe('neutral')
    expect(v.ariaLabel).toContain('1 statement executed')
  })
})

describe('filterBanner (WAF FilterOutcome overlay)', () => {
  it('reject reads crimson and surfaces the blocked terms in order', () => {
    const outcome: FilterOutcome = { mode: 'reject', blocked: ['UNION', 'SELECT'] }
    const v = filterBanner(outcome)
    expect(v.mode).toBe('reject')
    expect(v.tone).toBe('attack')
    expect(v.terms).toEqual(['UNION', 'SELECT'])
    expect(v.ariaLabel).toContain('UNION, SELECT')
  })

  it('strip reads steel/info and reports the neutered input', () => {
    const outcome: FilterOutcome = {
      mode: 'strip',
      blocked: ['OR'],
      effectiveInput: "' 1=1 -- ",
    }
    const v = filterBanner(outcome)
    expect(v.mode).toBe('strip')
    expect(v.tone).toBe('info')
    expect(v.effectiveInput).toBe("' 1=1 -- ")
    expect(v.ariaLabel).toContain('became')
  })

  it('handles a strip that emptied the input', () => {
    const v = filterBanner({ mode: 'strip', blocked: ['admin'], effectiveInput: '' })
    expect(v.effectiveInput).toBe('')
    expect(v.ariaLabel).toContain('empty')
  })
})
