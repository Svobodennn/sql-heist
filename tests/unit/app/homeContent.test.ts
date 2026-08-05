import { describe, it, expect } from 'vitest'
import { buildHomeContent, buildTickerTrack } from '@/app/homeContent'

const en = buildHomeContent('en')

describe('homeContent', () => {
  it('ticker carries the signature injection payloads (verbatim, never localized)', () => {
    const payloads = en.ticker.filter((i) => i.kind === 'payload').map((i) => i.text)
    expect(payloads.some((p) => p.includes("OR '1'='1'"))).toBe(true)
    expect(payloads.some((p) => p.includes('UNION SELECT'))).toBe(true)
    expect(payloads.some((p) => p.includes('DROP TABLE'))).toBe(true)
    expect(payloads.some((p) => p.includes('sqlite_master'))).toBe(true)
  })

  it('the heist loop is exactly the five canonical moves in order (en)', () => {
    expect(en.loop.map((s) => s.title)).toEqual(['Brief', 'Recon', 'Exploit', 'Loot', 'Debrief'])
    for (const step of en.loop) expect(step.blurb.trim().length).toBeGreaterThan(0)
  })

  it('the faq teaser is a short 3-5 set with unique, non-empty entries', () => {
    expect(en.faqTeasers.length).toBeGreaterThanOrEqual(3)
    expect(en.faqTeasers.length).toBeLessThanOrEqual(5)
    const questions = en.faqTeasers.map((f) => f.q)
    expect(new Set(questions).size).toBe(questions.length)
    for (const item of en.faqTeasers) {
      expect(item.q.trim().length).toBeGreaterThan(0)
      expect(item.a.trim().length).toBeGreaterThan(0)
    }
  })

  it('buildTickerTrack doubles the list so the -50% loop has no seam', () => {
    const track = buildTickerTrack(en.ticker)
    expect(track).toHaveLength(en.ticker.length * 2)
    expect(track.slice(0, en.ticker.length)).toEqual([...en.ticker])
    expect(track.slice(en.ticker.length)).toEqual([...en.ticker])
  })

  it('copy has a primary CTA and every section heading for the landing', () => {
    expect(en.copy.hero.primaryCta.trim().length).toBeGreaterThan(0)
    expect(en.copy.what.title.trim().length).toBeGreaterThan(0)
    expect(en.copy.how.title.trim().length).toBeGreaterThan(0)
    expect(en.copy.faq.title.trim().length).toBeGreaterThan(0)
    expect(en.copy.closer.cta.trim().length).toBeGreaterThan(0)
  })

  it('localizes tr/pl: prose differs from en but payloads + structure hold', () => {
    const enPayloads = en.ticker.filter((i) => i.kind === 'payload').map((i) => i.text)
    for (const loc of ['tr', 'pl'] as const) {
      const c = buildHomeContent(loc)
      expect(c.ticker).toHaveLength(en.ticker.length)
      expect(c.loop).toHaveLength(5)
      expect(c.faqTeasers).toHaveLength(en.faqTeasers.length)
      // Payloads are SQL (code) — identical across every locale.
      expect(c.ticker.filter((i) => i.kind === 'payload').map((i) => i.text)).toEqual(enPayloads)
      // Prose is translated — the tagline is no longer the English one.
      expect(c.copy.hero.tagline).not.toBe(en.copy.hero.tagline)
    }
  })
})
