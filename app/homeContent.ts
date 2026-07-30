// Landing content + the one piece of marquee logic, kept out of the JSX so the
// page component stays a thin, static Server Component and so the copy/loop
// invariants are unit-testable in the node test env (no jsdom needed). Prose
// lives here as plain strings and is rendered via {expressions}, which also
// sidesteps react/no-unescaped-entities in page.tsx.

export type TickerKind = 'payload' | 'line'
export type TickerItem = { text: string; kind: TickerKind }

// The wire never stops talking. Real injection payloads (crimson = ATTACK in the
// Semantic Color Law) interleaved with in-world heist lines. The whole marquee
// band is decorative (aria-hidden), so this is atmosphere, not page content.
export const TICKER_ITEMS: readonly TickerItem[] = [
  { text: "' OR '1'='1' --", kind: 'payload' },
  { text: 'The door was never locked.', kind: 'line' },
  { text: 'UNION SELECT username, password FROM users --', kind: 'payload' },
  { text: 'Read the wire. Run the payload.', kind: 'line' },
  { text: "'; DROP TABLE sessions --", kind: 'payload' },
  { text: "Meridian keeps everyone's secrets but its own.", kind: 'line' },
  { text: "' UNION SELECT name, sql FROM sqlite_master --", kind: 'payload' },
  { text: 'Learn the break-in. Build the lock.', kind: 'line' },
  { text: "admin' --", kind: 'payload' },
  { text: 'No real target. No net but the sandbox.', kind: 'line' },
  { text: "1' AND '1'='2", kind: 'payload' },
  { text: 'Every query is a door. Some are ajar.', kind: 'line' },
] as const

// A seamless CSS marquee renders the track twice and animates exactly -50%, so
// the loop point is invisible. This helper guarantees the doubling that the
// animation math depends on (see .tickerTrack in page.module.css).
export function buildTickerTrack<T>(items: readonly T[]): T[] {
  return [...items, ...items]
}

export type HeistStep = { title: string; blurb: string }

// The five moves, mirrored from /help but tightened to one line each.
export const HEIST_LOOP: readonly HeistStep[] = [
  { title: 'Brief', blurb: 'The Fixer names the mark and the take — never the method.' },
  { title: 'Recon', blurb: 'Case the target. Find where your input actually lands.' },
  { title: 'Exploit', blurb: 'Type into the form, watch the live query your input builds, then run it.' },
  { title: 'Loot', blurb: 'The take and your score. Nobody stopped you — that is the point.' },
  { title: 'Debrief', blurb: 'The vulnerable code beside the fix that closes it. This is defence.' },
] as const

export type FaqTeaser = { q: string; a: string }

// A short teaser set; the full list lives on /faq.
export const FAQ_TEASERS: readonly FaqTeaser[] = [
  {
    q: 'Is this legal?',
    a: 'Yes. Every job runs entirely in your browser against a sandboxed SQLite database that ships with the game. No real systems, no network calls — nothing to break but the practice target.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'No. It runs in a modern browser. The SQLite engine loads on demand the first time you need it — no accounts, no downloads, no setup.',
  },
  {
    q: 'Do I need to know SQL already?',
    a: 'It helps. The game assumes you can read a SELECT and roughly follow a WHERE clause. It teaches you injection — not SQL from zero.',
  },
  {
    q: 'Are you teaching people to attack real websites?',
    a: 'We teach how injection works so you can recognise it and close it — every job ends with the fix, not the break-in. Use it only on systems you own or are allowed to test.',
  },
] as const

// All landing prose in one place. Apostrophes are avoided in inline JSX literals
// by routing text through here (rendered as expressions).
export const HOME_COPY = {
  hero: {
    eyebrow: 'Meridian Holdings · after hours',
    title: 'SQL Heist',
    tagline: 'Every system has a door somebody forgot to lock.',
    lede: 'You find them. A real database is on the other side — no simulation, no safety net but the sandbox. Pull three jobs. Then learn how they should have stopped you.',
    primaryCta: 'Take the first job',
    secondaryCta: 'How it works',
  },
  what: {
    eyebrow: 'Case File · 001',
    stamp: 'Classified',
    title: 'Learn the break-in to learn the lock',
    lede: 'SQL Heist is an educational SQL-injection game. You pull the attack against a real database, then study the code that should have stopped you — offence teaches defence better than any lecture.',
    facts: [
      { k: 'Where', v: '100% in your browser. Nothing ever touches the network.' },
      { k: 'Against', v: 'A real SQLite engine, seeded fresh for every single run.' },
      { k: 'Risk', v: 'No real target — the only thing you can break is the sandbox.' },
    ],
    safe: 'Safe by design — no accounts, no downloads, no setup.',
  },
  how: {
    eyebrow: 'The Job',
    title: 'Five moves, every time',
    lede: 'Every job runs the same arc, so you always know exactly where you are in it.',
  },
  faq: {
    eyebrow: 'Straight Answers',
    title: 'Before your first job',
    more: 'Read every answer the Fixer gives',
  },
  closer: {
    fixerName: 'The Fixer',
    fixerLine: '“Three jobs. You keep what you learn — Meridian keeps the bill.”',
    title: 'The door is open. Walk through it.',
    cta: 'Take the first job',
  },
} as const
