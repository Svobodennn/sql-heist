import { describe, it, expect } from 'vitest'
import {
  TICKER_ITEMS,
  FAQ_TEASERS,
  HEIST_LOOP,
  HOME_COPY,
  buildTickerTrack,
} from './homeContent'

describe('homeContent', () => {
  it('ticker carries the signature injection payloads', () => {
    const payloads = TICKER_ITEMS.filter((i) => i.kind === 'payload').map((i) => i.text)
    expect(payloads.some((p) => p.includes("OR '1'='1'"))).toBe(true)
    expect(payloads.some((p) => p.includes('UNION SELECT'))).toBe(true)
    expect(payloads.some((p) => p.includes('DROP TABLE'))).toBe(true)
    expect(payloads.some((p) => p.includes('sqlite_master'))).toBe(true)
  })

  it('the heist loop is exactly the five canonical moves in order', () => {
    expect(HEIST_LOOP.map((s) => s.title)).toEqual([
      'Brief',
      'Recon',
      'Exploit',
      'Loot',
      'Debrief',
    ])
    for (const step of HEIST_LOOP) {
      expect(step.blurb.trim().length).toBeGreaterThan(0)
    }
  })

  it('the faq teaser is a short 3-5 set with unique, non-empty entries', () => {
    expect(FAQ_TEASERS.length).toBeGreaterThanOrEqual(3)
    expect(FAQ_TEASERS.length).toBeLessThanOrEqual(5)
    const questions = FAQ_TEASERS.map((f) => f.q)
    expect(new Set(questions).size).toBe(questions.length)
    for (const item of FAQ_TEASERS) {
      expect(item.q.trim().length).toBeGreaterThan(0)
      expect(item.a.trim().length).toBeGreaterThan(0)
    }
  })

  it('buildTickerTrack doubles the list so the -50% loop has no seam', () => {
    const track = buildTickerTrack(TICKER_ITEMS)
    expect(track).toHaveLength(TICKER_ITEMS.length * 2)
    // Both halves must equal the source, or the loop would visibly jump.
    expect(track.slice(0, TICKER_ITEMS.length)).toEqual([...TICKER_ITEMS])
    expect(track.slice(TICKER_ITEMS.length)).toEqual([...TICKER_ITEMS])
  })

  it('buildTickerTrack does not mutate its input', () => {
    const snapshot = [...TICKER_ITEMS]
    buildTickerTrack(TICKER_ITEMS)
    expect([...TICKER_ITEMS]).toEqual(snapshot)
  })

  it('copy has a primary CTA and both section headings for the landing', () => {
    expect(HOME_COPY.hero.primaryCta.trim().length).toBeGreaterThan(0)
    expect(HOME_COPY.what.title.trim().length).toBeGreaterThan(0)
    expect(HOME_COPY.how.title.trim().length).toBeGreaterThan(0)
    expect(HOME_COPY.faq.title.trim().length).toBeGreaterThan(0)
    expect(HOME_COPY.closer.cta.trim().length).toBeGreaterThan(0)
  })
})
