import { afterEach, describe, expect, it, vi } from 'vitest'
import sitemap from '@/app/sitemap'

describe('sitemap', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('stamps every public entry with the static build time', () => {
    const buildTime = new Date('2026-08-31T12:00:00.000Z')
    vi.useFakeTimers()
    vi.setSystemTime(buildTime)

    const entries = sitemap()

    expect(entries.length).toBeGreaterThan(0)
    expect(
      entries.every(
        (entry) =>
          entry.lastModified instanceof Date &&
          entry.lastModified.toISOString() === buildTime.toISOString(),
      ),
    ).toBe(true)
    expect(entries.some((entry) => /\/(?:auth|account|u)(?:\/|$)/.test(entry.url))).toBe(false)
  })
})
