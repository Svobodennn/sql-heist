import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSupabaseMock } = vi.hoisted(() => ({ getSupabaseMock: vi.fn() }))

vi.mock('@/lib/supabase', () => ({ getSupabase: getSupabaseMock }))

import {
  fetchServerProgress,
  mergeCaseProgress,
  mergeLocalIntoServer,
  pushObjectiveWin,
  subtractCaseProgress,
} from '@/features/game/lib/progressSync'

interface MockSupabaseOptions {
  rows?: unknown[]
  selectError?: { message: string } | null
  rpcError?: { message: string } | null
}

function useMockSupabase({
  rows = [],
  selectError = null,
  rpcError = null,
}: MockSupabaseOptions = {}) {
  const select = vi.fn(async () => ({ data: rows, error: selectError }))
  const from = vi.fn(() => ({ select }))
  const rpc = vi.fn(async () => ({ data: null, error: rpcError }))
  getSupabaseMock.mockReturnValue({ from, rpc })
  return { from, select, rpc }
}

beforeEach(() => {
  getSupabaseMock.mockReset()
})

describe('mergeCaseProgress', () => {
  it('returns an empty map when both sources are empty', () => {
    expect(mergeCaseProgress({}, {})).toEqual({})
  })

  it('keeps local-only progress', () => {
    const local = {
      'the-front-door': { objectives: ['bypass-login', 'map-schema'] },
    }

    expect(mergeCaseProgress(local, {})).toEqual(local)
  })

  it('keeps server-only progress', () => {
    const server = {
      'the-quiet-room': { objectives: ['probe-pin'] },
    }

    expect(mergeCaseProgress({}, server)).toEqual(server)
  })

  it('unions overlapping cases without mutating either source', () => {
    const local = {
      'the-front-door': { objectives: ['bypass-login', 'map-schema'] },
    }
    const server = {
      'the-front-door': { objectives: ['map-schema', 'drain-accounts'] },
      'the-vault': { objectives: ['extract-ledger'] },
    }

    expect(mergeCaseProgress(local, server)).toEqual({
      'the-front-door': {
        objectives: ['bypass-login', 'map-schema', 'drain-accounts'],
      },
      'the-vault': { objectives: ['extract-ledger'] },
    })
    expect(local).toEqual({
      'the-front-door': { objectives: ['bypass-login', 'map-schema'] },
    })
    expect(server).toEqual({
      'the-front-door': { objectives: ['map-schema', 'drain-accounts'] },
      'the-vault': { objectives: ['extract-ledger'] },
    })
  })

  it('is idempotent when the same progress is merged repeatedly', () => {
    const local = {
      'the-front-door': { objectives: ['bypass-login'] },
    }
    const server = {
      'the-front-door': { objectives: ['bypass-login', 'map-schema'] },
    }
    const merged = mergeCaseProgress(local, server)

    expect(mergeCaseProgress(merged, server)).toEqual(merged)
    expect(mergeCaseProgress(merged, merged)).toEqual(merged)
  })
})

describe('subtractCaseProgress', () => {
  it('retires only the adopted objectives and preserves newer anonymous wins', () => {
    const current = {
      'the-front-door': { objectives: ['bypass-login', 'map-schema'] },
      'the-vault': { objectives: ['extract-ledger'] },
    }
    const adopted = {
      'the-front-door': { objectives: ['bypass-login'] },
    }

    expect(subtractCaseProgress(current, adopted)).toEqual({
      'the-front-door': { objectives: ['map-schema'] },
      'the-vault': { objectives: ['extract-ledger'] },
    })
    expect(current['the-front-door'].objectives).toEqual(['bypass-login', 'map-schema'])
    expect(adopted['the-front-door'].objectives).toEqual(['bypass-login'])
  })

  it('drops empty cases and is idempotent', () => {
    const current = { 'the-front-door': { objectives: ['bypass-login'] } }
    const adopted = { 'the-front-door': { objectives: ['bypass-login'] } }

    expect(subtractCaseProgress(current, adopted)).toEqual({})
    expect(subtractCaseProgress(subtractCaseProgress(current, adopted), adopted)).toEqual({})
  })
})

describe('progress sync transport', () => {
  it('no-ops cleanly when Supabase is disabled', async () => {
    getSupabaseMock.mockReturnValue(null)
    const local = { 'the-front-door': { objectives: ['bypass-login'] } }

    await expect(fetchServerProgress()).resolves.toEqual({})
    await expect(pushObjectiveWin('the-front-door', 'bypass-login')).resolves.toBeUndefined()
    await expect(mergeLocalIntoServer(local)).resolves.toEqual(local)
  })

  it('maps the caller-owned server rows into the local progress shape', async () => {
    const { from, select } = useMockSupabase({
      rows: [
        {
          case_id: 'the-front-door',
          completed_objectives: ['bypass-login', 'map-schema'],
        },
      ],
    })

    await expect(fetchServerProgress()).resolves.toEqual({
      'the-front-door': { objectives: ['bypass-login', 'map-schema'] },
    })
    expect(from).toHaveBeenCalledWith('case_progress')
    expect(select).toHaveBeenCalledWith('case_id, completed_objectives')
  })

  it('pushes a win through the atomic database upsert-union RPC', async () => {
    const { rpc } = useMockSupabase()

    await pushObjectiveWin('the-front-door', 'map-schema')

    expect(rpc).toHaveBeenCalledWith('upsert_case_progress', {
      p_case_id: 'the-front-door',
      p_completed_objectives: ['map-schema'],
    })
  })

  it('merges login progress and atomically upserts only non-empty local cases', async () => {
    const { rpc } = useMockSupabase({
      rows: [
        {
          case_id: 'the-front-door',
          completed_objectives: ['map-schema'],
        },
        {
          case_id: 'the-vault',
          completed_objectives: ['extract-ledger'],
        },
      ],
    })
    const local = {
      'the-front-door': { objectives: ['bypass-login'] },
      'the-quiet-room': { objectives: [] },
    }

    await expect(mergeLocalIntoServer(local)).resolves.toEqual({
      'the-front-door': { objectives: ['bypass-login', 'map-schema'] },
      'the-quiet-room': { objectives: [] },
      'the-vault': { objectives: ['extract-ledger'] },
    })
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('upsert_case_progress', {
      p_case_id: 'the-front-door',
      p_completed_objectives: ['bypass-login'],
    })
  })

  it('surfaces transport failures for callers to degrade without blocking play', async () => {
    useMockSupabase({ selectError: { message: 'progress read failed' } })
    await expect(fetchServerProgress()).rejects.toThrow('progress read failed')

    useMockSupabase({ rpcError: { message: 'progress write failed' } })
    await expect(pushObjectiveWin('the-front-door', 'map-schema')).rejects.toThrow(
      'progress write failed',
    )
  })
})
