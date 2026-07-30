import { afterEach, describe, expect, it, vi } from 'vitest'
import { readProgress } from './useProgress'

// Module-private in useProgress.ts; mirror the literal so a rename surfaces here.
const STORAGE_KEY = 'sql-heist:progress:v1'

// The node vitest env has no `window`, so readProgress would take its SSR
// short-circuit. Stub a minimal localStorage holding the raw string a real browser
// would carry, so the read + Zod-validate path (F4) actually runs.
function stubLocalStorage(raw: string | null) {
  const store = new Map<string, string>()
  if (raw !== null) store.set(STORAGE_KEY, raw)
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
      clear: () => {
        store.clear()
      },
    },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('readProgress — localStorage validation (F4)', () => {
  it('returns {} for non-JSON garbage (JSON.parse throws — no crash, no leak)', () => {
    stubLocalStorage('not json {{{')
    expect(readProgress()).toEqual({})
  })

  it('returns {} for valid JSON with the wrong value shape', () => {
    stubLocalStorage(JSON.stringify({ 'job-1': { completed: 'yes', bestScore: 'lots' } }))
    expect(readProgress()).toEqual({})
  })

  it('returns {} for a JSON array (not a record of jobs)', () => {
    stubLocalStorage(JSON.stringify([1, 2, 3]))
    expect(readProgress()).toEqual({})
  })

  it('returns {} for a JSON null', () => {
    stubLocalStorage(JSON.stringify(null))
    expect(readProgress()).toEqual({})
  })

  it('returns {} when the key is absent', () => {
    stubLocalStorage(null)
    expect(readProgress()).toEqual({})
  })

  it('returns {} on the SSR path when there is no window', () => {
    // no stub -> typeof window === 'undefined'
    expect(readProgress()).toEqual({})
  })

  it('returns the parsed map for a well-formed record', () => {
    const valid = { 'front-door': { completed: true, bestScore: 900 } }
    stubLocalStorage(JSON.stringify(valid))
    expect(readProgress()).toEqual(valid)
  })

  it('strips unknown extra keys inside an entry, keeping the valid fields', () => {
    stubLocalStorage(JSON.stringify({ vault: { completed: true, bestScore: 700, streak: 3 } }))
    expect(readProgress()).toEqual({ vault: { completed: true, bestScore: 700 } })
  })
})
