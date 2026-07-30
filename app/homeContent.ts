// Landing content + the one piece of marquee logic, kept out of the JSX so the
// page component stays a thin, static Server Component and so the copy/loop
// invariants are unit-testable in the node test env (no jsdom needed).
//
// WS4: the display copy now lives in the i18n catalog (messages/en.json → `home`)
// and is read here at build time in the default locale. The landing is a Server
// Component under `output: 'export'`, so it renders in the default locale (en) —
// these structures stay the single shape the page consumes, now translation-ready.
// Injection PAYLOADS stay literal here: they are SQL (code), never localized.
import en from '@/messages/en.json'

const H = en.home

export type TickerKind = 'payload' | 'line'
export type TickerItem = { text: string; kind: TickerKind }

// The wire never stops talking. Real injection payloads (crimson = ATTACK in the
// Semantic Color Law) interleaved with in-world heist lines. The whole marquee
// band is decorative (aria-hidden), so this is atmosphere, not page content.
// Payloads are code (kept verbatim); the in-world lines come from the catalog.
export const TICKER_ITEMS: readonly TickerItem[] = [
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
]

// A seamless CSS marquee renders the track twice and animates exactly -50%, so
// the loop point is invisible. This helper guarantees the doubling that the
// animation math depends on (see .tickerTrack in page.module.css).
export function buildTickerTrack<T>(items: readonly T[]): T[] {
  return [...items, ...items]
}

export type HeistStep = { title: string; blurb: string }

// The five moves, mirrored from /help but tightened to one line each.
export const HEIST_LOOP: readonly HeistStep[] = [
  { title: H.loop['0'].title, blurb: H.loop['0'].blurb },
  { title: H.loop['1'].title, blurb: H.loop['1'].blurb },
  { title: H.loop['2'].title, blurb: H.loop['2'].blurb },
  { title: H.loop['3'].title, blurb: H.loop['3'].blurb },
  { title: H.loop['4'].title, blurb: H.loop['4'].blurb },
]

export type FaqTeaser = { q: string; a: string }

// A short teaser set; the full list lives on /faq.
export const FAQ_TEASERS: readonly FaqTeaser[] = [
  { q: H.faqTeasers['0'].q, a: H.faqTeasers['0'].a },
  { q: H.faqTeasers['1'].q, a: H.faqTeasers['1'].a },
  { q: H.faqTeasers['2'].q, a: H.faqTeasers['2'].a },
  { q: H.faqTeasers['3'].q, a: H.faqTeasers['3'].a },
]

// All landing prose in one place, sourced from the catalog and rendered via
// {expressions} (which also sidesteps react/no-unescaped-entities in page.tsx).
export const HOME_COPY = {
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
  how: {
    eyebrow: H.how.eyebrow,
    title: H.how.title,
    lede: H.how.lede,
  },
  faq: {
    eyebrow: H.faq.eyebrow,
    title: H.faq.title,
    more: H.faq.more,
  },
  closer: {
    fixerName: H.closer.fixerName,
    fixerLine: H.closer.fixerLine,
    title: H.closer.title,
    cta: H.closer.cta,
  },
}
