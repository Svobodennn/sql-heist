// Landing content + the one piece of marquee logic, kept out of the JSX so the
// page component stays a thin Server Component and so the copy/loop invariants are
// unit-testable in the node test env (no jsdom needed).
//
// WS4 + per-locale export: the display copy lives in the i18n catalog
// (messages/<locale>.json → `home`). `buildHomeContent(locale)` reads the requested
// locale's catalog, so the unprefixed en route and the /tr, /pl static routes each
// render their own language at build time. Injection PAYLOADS stay literal here:
// they are SQL (code), never localized.
import type { Locale } from '@/i18n/config'
import { getMessages } from '@/i18n/messages'
import type en from '@/messages/en.json'

export type TickerKind = 'payload' | 'line'
export type TickerItem = { text: string; kind: TickerKind }
export type HeistStep = { title: string; blurb: string }
export type FaqTeaser = { q: string; a: string }

export interface HomeContent {
  ticker: readonly TickerItem[]
  loop: readonly HeistStep[]
  faqTeasers: readonly FaqTeaser[]
  copy: {
    hero: { eyebrow: string; title: string; tagline: string; lede: string; primaryCta: string; secondaryCta: string }
    what: {
      eyebrow: string
      stamp: string
      title: string
      lede: string
      facts: readonly { k: string; v: string }[]
      safe: string
    }
    how: { eyebrow: string; title: string; lede: string }
    faq: { eyebrow: string; title: string; more: string }
    closer: { fixerName: string; fixerLine: string; title: string; cta: string }
  }
}

// A seamless CSS marquee renders the track twice and animates exactly -50%, so the
// loop point is invisible. This helper guarantees the doubling the animation math
// depends on (see .tickerTrack in page.module.css).
export function buildTickerTrack<T>(items: readonly T[]): T[] {
  return [...items, ...items]
}

export function buildHomeContent(locale: Locale): HomeContent {
  // The catalog is structurally identical across locales (verified in the i18n
  // pass); cast to the en shape for typed access to the `home` subtree.
  const H = (getMessages(locale) as typeof en).home

  return {
    // The wire never stops talking. Real payloads (crimson = ATTACK) interleave with
    // in-world lines; payloads are code (verbatim), the lines come from the catalog.
    ticker: [
      { text: "' OR '1'='1' --", kind: 'payload' },
      { text: H.ticker['0'], kind: 'line' },
      { text: 'UNION SELECT username, password FROM users --', kind: 'payload' },
      { text: H.ticker['1'], kind: 'line' },
      { text: "'; DROP TABLE sessions --", kind: 'payload' },
      { text: H.ticker['2'], kind: 'line' },
      { text: "' UNION SELECT name, sql FROM sqlite_master --", kind: 'payload' },
      { text: H.ticker['3'], kind: 'line' },
      { text: "admin' --", kind: 'payload' },
      { text: H.ticker['4'], kind: 'line' },
      { text: "1' AND '1'='2", kind: 'payload' },
      { text: H.ticker['5'], kind: 'line' },
    ],
    loop: [
      { title: H.loop['0'].title, blurb: H.loop['0'].blurb },
      { title: H.loop['1'].title, blurb: H.loop['1'].blurb },
      { title: H.loop['2'].title, blurb: H.loop['2'].blurb },
      { title: H.loop['3'].title, blurb: H.loop['3'].blurb },
      { title: H.loop['4'].title, blurb: H.loop['4'].blurb },
    ],
    faqTeasers: [
      { q: H.faqTeasers['0'].q, a: H.faqTeasers['0'].a },
      { q: H.faqTeasers['1'].q, a: H.faqTeasers['1'].a },
      { q: H.faqTeasers['2'].q, a: H.faqTeasers['2'].a },
      { q: H.faqTeasers['3'].q, a: H.faqTeasers['3'].a },
    ],
    copy: {
      hero: {
        eyebrow: H.hero.eyebrow,
        title: H.hero.title,
        tagline: H.hero.tagline,
        lede: H.hero.lede,
        primaryCta: H.hero.primaryCta,
        secondaryCta: H.hero.secondaryCta,
      },
      what: {
        eyebrow: H.what.eyebrow,
        stamp: H.what.stamp,
        title: H.what.title,
        lede: H.what.lede,
        facts: [
          { k: H.what.facts['0'].k, v: H.what.facts['0'].v },
          { k: H.what.facts['1'].k, v: H.what.facts['1'].v },
          { k: H.what.facts['2'].k, v: H.what.facts['2'].v },
        ],
        safe: H.what.safe,
      },
      how: { eyebrow: H.how.eyebrow, title: H.how.title, lede: H.how.lede },
      faq: { eyebrow: H.faq.eyebrow, title: H.faq.title, more: H.faq.more },
      closer: {
        fixerName: H.closer.fixerName,
        fixerLine: H.closer.fixerLine,
        title: H.closer.title,
        cta: H.closer.cta,
      },
    },
  }
}
