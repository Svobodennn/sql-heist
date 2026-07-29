import type { Database, SqlJsStatic } from 'sql.js'
import type { Level, VisibleTable } from '@/lib/schema/level'
import { loadSqlJs, type LoadSqlJsOptions } from '@/lib/engine/sqlLoader'
import { compose } from '@/lib/engine/queryComposer'
import { exec, type ExecutionResult } from '@/lib/engine/sqlRunner'

// Level lifecycle wrapper (docs/01-architecture.md §2.2, §3.2). Each level gets
// its OWN fresh in-memory DB; reset() throws the tainted DB away and rebuilds
// from schema+seed so a destructive payload (DROP/DELETE) can't poison the next
// attempt. run() = compose + exec; win evaluation stays a SEPARATE call (§5).

export interface LevelSession {
  run(inputs: Record<string, string>): ExecutionResult
  reset(): void
  dispose(): void
  readonly visibleSchema: VisibleTable[]
}

export interface SqlEngine {
  init(): Promise<void>
  openLevel(level: Level): Promise<LevelSession>
}

export type SqlEngineOptions = LoadSqlJsOptions

class LevelSessionImpl implements LevelSession {
  private db: Database
  private disposed = false

  constructor(
    private readonly sql: SqlJsStatic,
    private readonly level: Level,
  ) {
    this.db = this.build()
  }

  private build(): Database {
    const db = new this.sql.Database()
    db.run(this.level.database.schemaSql) // DDL
    db.run(this.level.database.seedSql) // seed + loot rows
    return db
  }

  private assertLive(): void {
    if (this.disposed) throw new Error('LevelSession has been disposed')
  }

  get visibleSchema(): VisibleTable[] {
    return this.level.database.visibleSchema
  }

  run(inputs: Record<string, string>): ExecutionResult {
    this.assertLive()
    const composed = compose(this.level.query.template, inputs)
    return exec(this.db, composed.sql)
  }

  reset(): void {
    this.assertLive()
    this.db.close()
    this.db = this.build()
  }

  dispose(): void {
    if (this.disposed) return
    this.db.close()
    this.disposed = true
  }
}

export function createSqlEngine(options?: SqlEngineOptions): SqlEngine {
  let sql: SqlJsStatic | undefined

  return {
    async init(): Promise<void> {
      sql = await loadSqlJs(options)
    },
    async openLevel(level: Level): Promise<LevelSession> {
      if (!sql) {
        throw new Error('SqlEngine.init() must be called before openLevel()')
      }
      return new LevelSessionImpl(sql, level)
    },
  }
}
