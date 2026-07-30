import type { Level, SqlCell, WinCondition } from '@/lib/schema/level'
import type { ComposedQuery } from '@/lib/engine/queryComposer'
import type { ExecutionResult } from '@/lib/engine/sqlRunner'

// Technique-adaptive UI signal (docs/ws3-design.md "Engine → UI Signal contract").
// deriveSignal is a PURE interpretation of what compose/exec ALREADY produced —
// it changes nothing about how exec/compose/evaluate work. The Exploit screen
// ("THE WIRE") switches its render on RunSignal.kind. The WAF FilterOutcome is a
// SEPARATE orthogonal overlay surfaced by levelSession.run (see queryComposer).

export type RunSignal =
  | { kind: 'rows'; columns: string[]; rows: SqlCell[][] } // classic / union / auth
  | { kind: 'oracle'; value: boolean; basis: string } // blind-boolean
  | { kind: 'timing'; delayMs: number; slow: boolean; threshold: number } // blind-timing (MODELED)
  | { kind: 'error'; message: string; leaked?: string } // error-based
  | { kind: 'side-effect'; statements: number; summary: string } // stacked-queries

// blind-timing is SYMBOLIC: sql.js is synchronous, so wall-clock time is never
// measured. Defaults for the modeled meter when a level pins no override; a level
// may tune them via its blind-timing winCondition (thresholdMs / slowDelayMs).
export const DEFAULT_TIMING_THRESHOLD_MS = 1000
export const DEFAULT_MODELED_SLOW_MS = 2500

// Signal derivation keys off winCondition.type — that is exactly what determines
// what the run OBSERVABLY produces (and what evaluate() reads). The four WS3 win
// types map 1:1 to their special signals; the three classic types render as rows.
// (A waf-bypass level is orthogonal: its win is still one of these, so it renders
// as rows/etc.; the WAF story rides the separate FilterOutcome overlay.)
export function deriveSignal(
  level: Level,
  composed: ComposedQuery,
  result: ExecutionResult,
): RunSignal {
  const cond = level.winCondition
  switch (cond.type) {
    case 'blind-boolean':
      return oracleSignal(result)
    case 'blind-timing':
      return timingSignal(cond, result)
    case 'error-based':
      return errorSignal(cond, result)
    case 'stacked-queries':
      return sideEffectSignal(composed, result)
    case 'rows-returned':
    case 'flag-in-result':
    case 'row-match':
      return rowsSignal(result)
  }
}

// Copy-on-read: hand the UI its own grid arrays so it can sort/mutate freely
// without poisoning the live execution result.
function rowsSignal(result: ExecutionResult): RunSignal {
  return {
    kind: 'rows',
    columns: [...result.columns],
    rows: result.rows.map((row) => [...row]),
  }
}

// Oracle TRUE ⇔ a row came back (the evaluator's boolean-oracle model). An errored
// probe never cleanly answers, so it reads FALSE.
function oracleSignal(result: ExecutionResult): RunSignal {
  if (result.error) {
    return { kind: 'oracle', value: false, basis: 'The probe errored — no clean oracle answer (read as FALSE).' }
  }
  const value = result.rowCount > 0
  const basis = value
    ? `${result.rowCount} row(s) returned — the boolean condition held TRUE.`
    : 'Zero rows returned — the boolean condition held FALSE.'
  return { kind: 'oracle', value, basis }
}

// MODELED timing (never wall-clock). The intended time-branch "fires" under the
// same symbolic rule as the boolean oracle: a row comes back. When it fires we
// report the modeled slow delay (as if the injected SLEEP ran); otherwise 0.
// slow = delayMs >= threshold. Deterministic: identical (result) => identical
// delayMs, regardless of result.durationMs (which is IGNORED here).
function timingSignal(
  cond: Extract<WinCondition, { type: 'blind-timing' }>,
  result: ExecutionResult,
): RunSignal {
  const threshold = cond.thresholdMs ?? DEFAULT_TIMING_THRESHOLD_MS
  const slowDelay = cond.slowDelayMs ?? DEFAULT_MODELED_SLOW_MS
  const fired = !result.error && result.rowCount > 0
  const delayMs = fired ? slowDelay : 0
  return { kind: 'timing', delayMs, slow: delayMs >= threshold, threshold }
}

// error-based is honest-illustrative: pass the real SQLite message through, and
// only claim a `leaked` structural token when it is ACTUALLY present in that
// message (the scenario's intended reveal = winCondition.errorContains).
function errorSignal(
  cond: Extract<WinCondition, { type: 'error-based' }>,
  result: ExecutionResult,
): RunSignal {
  const message = result.error ?? ''
  const token = cond.errorContains
  const leaked = token && result.error?.includes(token) ? token : undefined
  return leaked ? { kind: 'error', message, leaked } : { kind: 'error', message }
}

// Best-effort structural statement count from the composed payload. sql.js only
// surfaces a result set for ROW-PRODUCING statements, so a destructive stack
// (DROP/DELETE — "table gone") leaves NO trace in the result; counting the
// payload's top-level statements is the only honest way to report it. Illustrative
// only — evaluate() still gates the win on resultSetCount. Semicolons inside string
// literals could skew this; acceptable for a display readout over curated levels.
function countStatements(sql: string): number {
  return sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--')).length
}

function sideEffectSignal(composed: ComposedQuery, result: ExecutionResult): RunSignal {
  const statements = countStatements(composed.sql)
  const summary = result.error
    ? `The stacked payload errored before completing (${result.error}).`
    : statements >= 2
      ? `${statements} statements executed — the injection stacked ${statements - 1} past the app query; its side effect landed.`
      : 'A single statement ran — nothing was stacked, so no side effect.'
  return { kind: 'side-effect', statements, summary }
}
