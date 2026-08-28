import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const syncMocks = vi.hoisted(() => ({
  status: 'disabled' as 'loading' | 'anon' | 'authed' | 'disabled',
  userId: null as string | null,
  fetchServerProgress: vi.fn(),
}))

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({
    status: syncMocks.status,
    user: syncMocks.userId ? { id: syncMocks.userId } : null,
  }),
}))

vi.mock('@/features/game/lib/progressSync', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/game/lib/progressSync')>()
  return { ...actual, fetchServerProgress: syncMocks.fetchServerProgress }
})

import {
  accountCaseProgressStorageKey,
  claimAnonymousCaseProgress,
  readAccountCaseProgress,
  recordAccountObjectiveWin,
  useCaseProgress,
} from '@/features/game/lib/useCaseProgress'

const STORAGE_KEY = 'sql-heist:cases:v1'

function ProgressProbe() {
  const { records, ready } = useCaseProgress()
  return (
    <output data-testid="progress" data-ready={String(ready)}>
      {JSON.stringify(records)}
    </output>
  )
}

beforeEach(() => {
  syncMocks.status = 'disabled'
  syncMocks.userId = null
  syncMocks.fetchServerProgress.mockReset()
  window.localStorage.clear()
})

afterEach(cleanup)

describe('useCaseProgress auth sync', () => {
  it.each(['disabled', 'anon'] as const)(
    'keeps the existing local-only path when auth is %s',
    async (status) => {
      syncMocks.status = status
      const local = { 'the-front-door': { objectives: ['bypass-login'] } }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(local))

      render(<ProgressProbe />)

      await waitFor(() => expect(screen.getByTestId('progress').dataset.ready).toBe('true'))
      expect(screen.getByTestId('progress').textContent).toBe(JSON.stringify(local))
      expect(syncMocks.fetchServerProgress).not.toHaveBeenCalled()
    },
  )

  it('waits for an authenticated fetch and caches the union only under that account', async () => {
    syncMocks.status = 'authed'
    syncMocks.userId = 'user-a'
    const local = { 'the-front-door': { objectives: ['bypass-login'] } }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(local))
    let resolveServer!: (value: {
      'the-front-door': { objectives: string[] }
      'the-vault': { objectives: string[] }
    }) => void
    syncMocks.fetchServerProgress.mockReturnValue(
      new Promise((resolve) => {
        resolveServer = resolve
      }),
    )

    render(<ProgressProbe />)

    expect(screen.getByTestId('progress').dataset.ready).toBe('false')
    resolveServer({
      'the-front-door': { objectives: ['map-schema'] },
      'the-vault': { objectives: ['extract-ledger'] },
    })

    const merged = {
      'the-front-door': { objectives: ['bypass-login', 'map-schema'] },
      'the-vault': { objectives: ['extract-ledger'] },
    }
    await waitFor(() => expect(screen.getByTestId('progress').dataset.ready).toBe('true'))
    expect(screen.getByTestId('progress').textContent).toBe(JSON.stringify(merged))
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual(local)
    expect(
      JSON.parse(window.localStorage.getItem(accountCaseProgressStorageKey('user-a')) ?? '{}'),
    ).toEqual(merged)
  })

  it('falls back to local progress when the authenticated fetch fails', async () => {
    syncMocks.status = 'authed'
    syncMocks.userId = 'user-a'
    const local = { 'the-quiet-room': { objectives: ['probe-pin'] } }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(local))
    syncMocks.fetchServerProgress.mockRejectedValue(new Error('offline'))

    render(<ProgressProbe />)

    await waitFor(() => expect(screen.getByTestId('progress').dataset.ready).toBe('true'))
    expect(screen.getByTestId('progress').textContent).toBe(JSON.stringify(local))
    expect(syncMocks.fetchServerProgress).toHaveBeenCalledTimes(1)
  })

  it('claims anonymous progress into one account without exposing it to another account', () => {
    const anonymous = { 'the-front-door': { objectives: ['bypass-login'] } }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(anonymous))

    expect(claimAnonymousCaseProgress('user-a')).toEqual(anonymous)
    expect(readAccountCaseProgress('user-a')).toEqual(anonymous)
    expect(readAccountCaseProgress('user-b')).toEqual({})
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('records an authenticated win without mutating anonymous progress', () => {
    const anonymous = { 'the-front-door': { objectives: ['bypass-login'] } }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(anonymous))

    recordAccountObjectiveWin('user-a', 'the-vault', 'extract-ledger')

    expect(readAccountCaseProgress('user-a')).toEqual({
      'the-vault': { objectives: ['extract-ledger'] },
    })
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual(anonymous)
  })
})
