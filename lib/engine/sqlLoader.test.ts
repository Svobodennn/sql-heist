import { describe, expect, it, vi } from 'vitest'
import type { SqlJsStatic } from 'sql.js'

// Retry-path contract (docs/01-architecture.md §2.1: loading|ready|error + retry).
// A FAILED boot must never become the singleton — the next loadSqlJs() has to
// re-run initSqlJs. We mock sql.js so initSqlJs's resolution is deterministic
// (fail once, then succeed); the real-WASM smoke lives in tests/engine.
vi.mock('sql.js', () => ({ default: vi.fn() }))

import initSqlJs from 'sql.js'
import { loadSqlJs } from '@/lib/engine/sqlLoader'

const initMock = vi.mocked(initSqlJs)

describe('sqlLoader — a failed boot is not cached; the next call retries', () => {
  it('rejects the first boot, then retries and caches the second (resolved) module', async () => {
    const sqlModule = {} as SqlJsStatic
    initMock
      .mockRejectedValueOnce(new Error('WASM fetch failed'))
      .mockResolvedValueOnce(sqlModule)

    // 1) First boot fails and the returned promise rejects.
    await expect(loadSqlJs({ locateFile: () => 'bad' })).rejects.toThrow('WASM fetch failed')

    // 2) Because the rejection was NOT cached, this call re-runs initSqlJs.
    const resolved = await loadSqlJs({ locateFile: () => 'good' })
    expect(resolved).toBe(sqlModule)
    expect(initMock).toHaveBeenCalledTimes(2)

    // 3) The resolved module is now the singleton — no third init.
    const again = await loadSqlJs()
    expect(again).toBe(sqlModule)
    expect(initMock).toHaveBeenCalledTimes(2)
  })
})
