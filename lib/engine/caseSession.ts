import type { Database, SqlJsStatic } from 'sql.js'
import type { VisibleTable } from '@/lib/schema/level'
import type { Case } from '@/lib/schema/case'
import { loadSqlJs, type LoadSqlJsOptions } from '@/lib/engine/sqlLoader'
import { compose } from '@/lib/engine/queryComposer'
import { exec, type ExecutionResult, type RunResult } from '@/lib/engine/sqlRunner'

// Case lifecycle wrapper (docs/cases-design.md — Model A). Unlike a LevelSession
// (fresh DB per level), a CaseSession holds ONE database for the whole case and
// carries state across objectives. Snapshots (sql.js export/import) make it correct:
//   • every run restores to the current objective's start state, so retries are
//     deterministic and a failed/exploratory attempt can't poison the next;
//   • commitObjective(i) — called by the caller AFTER a winning run — captures the
//     current DB (incl. that run's writes, e.g. a stacked UPDATE) as the start
//     state for objective i+1, so a completed side effect carries forward.
// The frozen composer/runner are reused unchanged; win evaluation stays a SEPARATE
// call (winEvaluator), exactly as with LevelSession.

export interface CaseSession {
  runObjective(index: number, inputs: Record<string, string>): RunResult
  commitObjective(index: number): void
  reset(): void
  dispose(): void
  readonly visibleSchema: VisibleTable[]
  readonly objectiveCount: number
}

export interface CaseEngine {
  init(): Promise<void>
  openCase(gameCase: Case): Promise<CaseSession>
}

export type CaseEngineOptions = LoadSqlJsOptions

class CaseSessionImpl implements CaseSession {
  private db: Database
  private disposed = false
  // Start-of-objective DB snapshots. [0] is the fresh case DB; [i] is filled by
  // commitObjective(i-1). An unreached objective falls back to [0] (the initial
  // state) — safe because our pre-terminal objectives are read-only.
  private readonly snapshots: (Uint8Array | undefined)[]

  constructor(
    private readonly sql: SqlJsStatic,
    private readonly gameCase: Case,
  ) {
    this.db = this.build()
    this.snapshots = new Array(gameCase.objectives.length).fill(undefined)
    this.snapshots[0] = this.db.export()
  }

  private build(): Database {
    const db = new this.sql.Database()
    db.run(this.gameCase.database.schemaSql)
    db.run(this.gameCase.database.seedSql)
    return db
  }

  private assertLive(): void {
    if (this.disposed) throw new Error('CaseSession has been disposed')
  }

  private restore(bytes: Uint8Array): void {
    this.db.close()
    this.db = new this.sql.Database(bytes)
  }

  get objectiveCount(): number {
    return this.gameCase.objectives.length
  }

  // Copy-on-read (same contract as LevelSession) — the case owns the canonical schema.
  get visibleSchema(): VisibleTable[] {
    return this.gameCase.database.visibleSchema.map((t) => ({
      table: t.table,
      columns: [...t.columns],
    }))
  }

  runObjective(index: number, inputs: Record<string, string>): RunResult {
    this.assertLive()
    const objective = this.gameCase.objectives[index]
    if (!objective) throw new Error(`No objective at index ${index}`)
    // Deterministic attempts: restore to this objective's start state first.
    this.restore(this.snapshots[index] ?? this.snapshots[0]!)
    const composed = compose(objective.query.template, inputs, objective.query.inputFilter)
    const base: ExecutionResult = composed.rejected
      ? {
          composedSql: composed.sql,
          columns: [],
          rows: [],
          rowCount: 0,
          resultSetCount: 0,
          error: composed.filterMessage ?? 'Input rejected by the filter.',
          durationMs: 0,
        }
      : exec(this.db, composed.sql)
    return composed.filter ? { ...base, filter: composed.filter } : base
  }

  commitObjective(index: number): void {
    this.assertLive()
    const next = index + 1
    if (next < this.snapshots.length) {
      this.snapshots[next] = this.db.export()
    }
  }

  reset(): void {
    this.assertLive()
    this.db.close()
    this.db = this.build()
    this.snapshots.fill(undefined)
    this.snapshots[0] = this.db.export()
  }

  dispose(): void {
    if (this.disposed) return
    this.db.close()
    this.disposed = true
  }
}

export function createCaseEngine(options?: CaseEngineOptions): CaseEngine {
  let sql: SqlJsStatic | undefined

  return {
    async init(): Promise<void> {
      sql = await loadSqlJs(options)
    },
    async openCase(gameCase: Case): Promise<CaseSession> {
      if (!sql) {
        throw new Error('CaseEngine.init() must be called before openCase()')
      }
      return new CaseSessionImpl(sql, gameCase)
    },
  }
}
