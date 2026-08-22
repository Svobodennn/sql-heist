import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
})

vi.mock('@/features/auth/authClient', () => ({
  usernameAvailable: vi.fn(),
}))

import { usernameAvailable } from '@/features/auth/authClient'
import { useUsernameAvailability } from '@/features/auth/useUsernameAvailability'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.clearAllMocks()
})

// advanceTimersByTimeAsync fires due timers AND flushes the microtasks their
// callbacks schedule (the probe promise) — so no real-timer waitFor is needed.
const tick = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)))

describe('useUsernameAvailability', () => {
  it('is idle until the input is a valid username, then debounces the probe', async () => {
    vi.mocked(usernameAvailable).mockResolvedValue(true)
    const { result, rerender } = renderHook(({ u }) => useUsernameAvailability(u), {
      initialProps: { u: 'ab' }, // too short → never probes
    })
    expect(result.current).toBe('idle')
    await tick(500)
    expect(usernameAvailable).not.toHaveBeenCalled()

    rerender({ u: 'ada' })
    expect(result.current).toBe('checking')
    await tick(450)
    expect(result.current).toBe('available')
  })

  it('does NOT apply a stale response for a superseded candidate (H1 regression)', async () => {
    const deferred: Record<string, (v: boolean) => void> = {}
    vi.mocked(usernameAvailable).mockImplementation(
      (name: string) => new Promise<boolean>((resolve) => (deferred[name] = resolve)),
    )

    const { result, rerender } = renderHook(({ u }) => useUsernameAvailability(u), {
      initialProps: { u: 'ada' },
    })
    await tick(450) // probe A now in flight

    rerender({ u: 'adam' }) // cleanup cancels effect A
    expect(result.current).toBe('checking')

    await act(async () => {
      deferred['ada'](false) // A resolves "taken" AFTER being superseded
    })
    // The stale "taken" must NOT land on the current candidate.
    expect(result.current).toBe('checking')

    await tick(450) // probe B in flight
    await act(async () => {
      deferred['adam'](true)
    })
    expect(result.current).toBe('available')
  })

  it('resolves to idle when the probe cannot answer (null)', async () => {
    vi.mocked(usernameAvailable).mockResolvedValue(null as unknown as boolean)
    const { result } = renderHook(() => useUsernameAvailability('neo'))
    await tick(450)
    expect(result.current).toBe('idle')
  })
})
