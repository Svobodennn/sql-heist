import type { ComposedQuery, ComposedSegment, FilterOutcome } from '@/lib/engine/queryComposer'
import type { RunResult } from '@/lib/engine/sqlRunner'
import type { RunSignal } from '@/lib/engine/signal'

export interface ObjectiveReceipt {
  readonly inputs: Readonly<Record<string, string>>
  readonly composed: ComposedQuery
  readonly result: RunResult
  readonly signal: RunSignal
}

export type ObjectiveReceiptMap = Readonly<Record<string, ObjectiveReceipt>>

function copyFilter(filter: FilterOutcome | undefined): FilterOutcome | undefined {
  if (!filter) return undefined
  return filter.effectiveInput === undefined
    ? { mode: filter.mode, blocked: [...filter.blocked] }
    : { mode: filter.mode, blocked: [...filter.blocked], effectiveInput: filter.effectiveInput }
}

function copySegment(segment: ComposedSegment): ComposedSegment {
  return segment.kind === 'static'
    ? { kind: 'static', text: segment.text }
    : { kind: 'injected', field: segment.field, value: segment.value }
}

function copyComposed(composed: ComposedQuery): ComposedQuery {
  const base: ComposedQuery = {
    sql: composed.sql,
    template: composed.template,
    inputs: { ...composed.inputs },
    unresolved: [...composed.unresolved],
    segments: composed.segments.map(copySegment),
  }
  const filter = copyFilter(composed.filter)

  return {
    ...base,
    ...(composed.rejected === undefined ? {} : { rejected: composed.rejected }),
    ...(composed.filterMessage === undefined ? {} : { filterMessage: composed.filterMessage }),
    ...(filter === undefined ? {} : { filter }),
  }
}

function copyResult(result: RunResult): RunResult {
  const filter = copyFilter(result.filter)
  return {
    composedSql: result.composedSql,
    columns: [...result.columns],
    rows: result.rows.map((row) => [...row]),
    rowCount: result.rowCount,
    durationMs: result.durationMs,
    ...(result.error === undefined ? {} : { error: result.error }),
    ...(result.resultSetCount === undefined ? {} : { resultSetCount: result.resultSetCount }),
    ...(filter === undefined ? {} : { filter }),
  }
}

function copySignal(signal: RunSignal): RunSignal {
  switch (signal.kind) {
    case 'rows':
      return {
        kind: 'rows',
        columns: [...signal.columns],
        rows: signal.rows.map((row) => [...row]),
      }
    case 'oracle':
      return { kind: 'oracle', value: signal.value, basis: signal.basis }
    case 'timing':
      return {
        kind: 'timing',
        delayMs: signal.delayMs,
        slow: signal.slow,
        threshold: signal.threshold,
      }
    case 'error':
      return signal.leaked === undefined
        ? { kind: 'error', message: signal.message }
        : { kind: 'error', message: signal.message, leaked: signal.leaked }
    case 'side-effect':
      return {
        kind: 'side-effect',
        statements: signal.statements,
        summary: signal.summary,
      }
  }
}

export function createObjectiveReceipt(
  inputs: Readonly<Record<string, string>>,
  composed: ComposedQuery,
  result: RunResult,
  signal: RunSignal,
): ObjectiveReceipt {
  if (composed.sql !== result.composedSql) {
    throw new Error('Objective receipt must come from the same execution.')
  }

  return Object.freeze({
    inputs: Object.freeze({ ...inputs }),
    composed: copyComposed(composed),
    result: copyResult(result),
    signal: copySignal(signal),
  })
}

export function retainFirstObjectiveReceipt(
  receipts: ObjectiveReceiptMap,
  objectiveId: string,
  receipt: ObjectiveReceipt,
): ObjectiveReceiptMap {
  if (receipts[objectiveId]) return receipts
  return { ...receipts, [objectiveId]: receipt }
}
