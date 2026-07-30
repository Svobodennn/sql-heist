import type { RunSignal } from '@/lib/engine/signal'
import type { FilterOutcome } from '@/lib/engine/queryComposer'

// PURE presentation adapters for THE WIRE's adaptive signal panel
// (docs/ws3-design.md "UI scope"). deriveSignal (frozen engine) says WHAT the run
// produced; these say how to DRAW it — tone, formatted numbers, split spans, and
// the spoken a11y line. Kept pure + engine-free so they unit-test in the node
// suite against synthetic RunSignal fixtures, and so the React panel is a thin
// switch with no derivation logic of its own.
//
// Semantic Color Law (§1, WCAG 1.4.1): a `tone` never travels alone — every panel
// pairs it with an icon + a WORD, so meaning survives for colorblind users. TRUE
// reads jade, FALSE crimson (task spec), a slow timing branch reads crimson, a
// landed side effect reads crimson; benign/fast states stay neutral.

export type SignalKind = RunSignal['kind']

// defense -> jade, attack -> crimson, info -> steel, neutral -> muted ink.
export type SignalTone = 'defense' | 'attack' | 'info' | 'neutral'

export const SIGNAL_TITLES: Record<SignalKind, string> = {
  rows: 'What came back',
  oracle: 'The oracle',
  timing: 'Timing oracle',
  error: 'Error leak',
  'side-effect': 'Side effect',
}

export function isRowsSignal(
  signal: RunSignal | null,
): signal is Extract<RunSignal, { kind: 'rows' }> {
  return signal?.kind === 'rows'
}

// ── oracle ──────────────────────────────────────────────────────────────────
export interface OracleView {
  word: 'TRUE' | 'FALSE'
  value: boolean
  tone: 'defense' | 'attack' // jade TRUE / crimson FALSE (task spec)
  basis: string
  ariaLabel: string
}

export function oracleView(signal: Extract<RunSignal, { kind: 'oracle' }>): OracleView {
  const word = signal.value ? 'TRUE' : 'FALSE'
  return {
    word,
    value: signal.value,
    tone: signal.value ? 'defense' : 'attack',
    basis: signal.basis,
    ariaLabel: `Oracle answered ${word}. ${signal.basis}`,
  }
}

// ── timing ──────────────────────────────────────────────────────────────────
export interface TimingView {
  delayMs: number
  threshold: number
  slow: boolean
  fillPct: number // 0..100 — how far the latency bar fills (fast=left, slow=right)
  thresholdPct: number // 0..100 — where the crimson threshold marker sits
  word: 'slow' | 'fast'
  tone: 'attack' | 'neutral' // slow branch fired = crimson; fast = neutral
  ariaLabel: string
}

function clampPct(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, n))
}

// The meter is a RELATIVE scale (the timing model is symbolic, never wall-clock):
// full-scale = the larger of threshold/delay plus 20% headroom, so a fast run
// leaves the bar short of the threshold marker and a slow run overshoots it.
export function timingView(signal: Extract<RunSignal, { kind: 'timing' }>): TimingView {
  const fullScale = Math.max(signal.threshold, signal.delayMs, 1) * 1.2
  const word = signal.slow ? 'slow' : 'fast'
  return {
    delayMs: signal.delayMs,
    threshold: signal.threshold,
    slow: signal.slow,
    fillPct: clampPct((signal.delayMs / fullScale) * 100),
    thresholdPct: clampPct((signal.threshold / fullScale) * 100),
    word,
    tone: signal.slow ? 'attack' : 'neutral',
    ariaLabel: signal.slow
      ? `Modeled response ${signal.delayMs} milliseconds, past the ${signal.threshold} millisecond threshold — the timing branch fired (slow).`
      : `Modeled response ${signal.delayMs} milliseconds, under the ${signal.threshold} millisecond threshold — no delay (fast).`,
  }
}

// ── error ───────────────────────────────────────────────────────────────────
export interface ErrorSpan {
  text: string
  leaked: boolean
}

// Split the raw SQLite message around every occurrence of the leaked token so the
// panel can highlight it (as React-escaped text). No token / not present => one
// plain span. Never drops text and never emits an empty span.
export function errorSpans(message: string, leaked?: string): ErrorSpan[] {
  if (!leaked || leaked.length === 0 || !message.includes(leaked)) {
    return [{ text: message, leaked: false }]
  }
  const spans: ErrorSpan[] = []
  let cursor = 0
  while (cursor < message.length) {
    const next = message.indexOf(leaked, cursor)
    if (next === -1) {
      spans.push({ text: message.slice(cursor), leaked: false })
      break
    }
    if (next > cursor) spans.push({ text: message.slice(cursor, next), leaked: false })
    spans.push({ text: leaked, leaked: true })
    cursor = next + leaked.length
  }
  return spans
}

export interface ErrorView {
  spans: ErrorSpan[]
  leaked?: string
  tone: 'attack' // an error readout is always crimson
  ariaLabel: string
}

export function errorView(signal: Extract<RunSignal, { kind: 'error' }>): ErrorView {
  return {
    spans: errorSpans(signal.message, signal.leaked),
    leaked: signal.leaked,
    tone: 'attack',
    ariaLabel: signal.leaked
      ? `Error readout leaked "${signal.leaked}". Full message: ${signal.message}`
      : `Error readout: ${signal.message}`,
  }
}

// ── side-effect ───────────────────────────────────────────────────────────────
export interface SideEffectView {
  statements: number
  summary: string
  landed: boolean // >=2 statements => the injection stacked a real side effect
  tone: 'attack' | 'neutral'
  ariaLabel: string
}

export function sideEffectView(
  signal: Extract<RunSignal, { kind: 'side-effect' }>,
): SideEffectView {
  const landed = signal.statements >= 2
  return {
    statements: signal.statements,
    summary: signal.summary,
    landed,
    tone: landed ? 'attack' : 'neutral',
    ariaLabel: `${signal.statements} statement${signal.statements === 1 ? '' : 's'} executed. ${signal.summary}`,
  }
}

// ── WAF FilterOutcome banner ──────────────────────────────────────────────────
export interface FilterBannerView {
  mode: 'reject' | 'strip'
  tone: 'attack' | 'info' // reject = hard crimson stop; strip = steel alteration
  // The matched blocklist terms (reject) or the neutered input (strip). Rendered
  // as escaped text by the component.
  terms: string[]
  effectiveInput: string
  ariaLabel: string
}

export function filterBanner(filter: FilterOutcome): FilterBannerView {
  const terms = filter.blocked
  const termList = terms.length > 0 ? terms.join(', ') : 'nothing'
  if (filter.mode === 'reject') {
    return {
      mode: 'reject',
      tone: 'attack',
      terms,
      effectiveInput: '',
      ariaLabel: `Input rejected by the filter. Blocked: ${termList}.`,
    }
  }
  const effectiveInput = filter.effectiveInput ?? ''
  return {
    mode: 'strip',
    tone: 'info',
    terms,
    effectiveInput,
    ariaLabel: `The filter stripped ${termList}. Your input became: ${effectiveInput.length > 0 ? effectiveInput : 'empty'}.`,
  }
}
