import { describe, expect, it } from 'vitest'
import type { CodeSnippet } from '@/lib/schema/level'
import {
  normalizeSecureCode,
  selectSecureSnippets,
  nextTabIndex,
  stackLabel,
  type SecureCodeVariant,
} from './secureCode'

// Legacy: a single secure snippet (what every current level ships today).
const legacy: CodeSnippet = { language: 'js', code: 'db.prepare(sql).get(user, pass)' }

// Synthetic multi-stack fixture (WS2 tab-rendering source of truth): three
// per-stack secure variants, deliberately out of alphabetical order to prove
// the tab order follows the data, not a sort.
const variants: SecureCodeVariant[] = [
  { stack: 'Node.js', language: 'js', code: 'const row = db.prepare(q).get(u, p)' },
  { stack: 'Python', language: 'py', code: 'cur.execute(q, (u, p))' },
  { stack: 'PHP', language: 'php', code: '$stmt->execute([$u, $p]);' },
]

describe('normalizeSecureCode', () => {
  it('maps a legacy single CodeSnippet to exactly one tab', () => {
    const tabs = normalizeSecureCode(legacy)
    expect(tabs).toHaveLength(1)
    expect(tabs[0].stack).toBe('Node.js') // friendly label derived from "js"
    expect(tabs[0].snippet).toEqual(legacy)
  })

  it('maps an array of variants to N tabs preserving order and labels', () => {
    const tabs = normalizeSecureCode(variants)
    expect(tabs.map((t) => t.stack)).toEqual(['Node.js', 'Python', 'PHP'])
    expect(tabs[1].snippet).toEqual({ language: 'py', code: 'cur.execute(q, (u, p))' })
  })

  it('returns an empty array for null / undefined', () => {
    expect(normalizeSecureCode(null)).toEqual([])
    expect(normalizeSecureCode(undefined)).toEqual([])
  })

  it('derives a stack label from language when a variant omits its stack', () => {
    const tabs = normalizeSecureCode([{ stack: '', language: 'python', code: 'x' }])
    expect(tabs[0].stack).toBe('Python')
  })

  it('drops malformed variant entries instead of crashing', () => {
    // A stray null / missing code should be filtered, not throw.
    const dirty = [
      null,
      { stack: 'Go', language: 'go', code: 'row := db.QueryRow(q, u, p)' },
    ] as unknown as SecureCodeVariant[]
    const tabs = normalizeSecureCode(dirty)
    expect(tabs).toHaveLength(1)
    expect(tabs[0].stack).toBe('Go')
  })
})

describe('selectSecureSnippets (merge-order independent)', () => {
  it('prefers secureCodeVariants when present (N tabs)', () => {
    const tabs = selectSecureSnippets({ secureCode: legacy, secureCodeVariants: variants })
    expect(tabs).toHaveLength(3)
    expect(tabs[0].stack).toBe('Node.js')
  })

  it('falls back to the single secureCode when variants are absent (1 tab)', () => {
    const tabs = selectSecureSnippets({ secureCode: legacy })
    expect(tabs).toHaveLength(1)
    expect(tabs[0].snippet).toEqual(legacy)
  })

  it('treats an empty variants array as "use secureCode" — never zero tabs', () => {
    const tabs = selectSecureSnippets({ secureCode: legacy, secureCodeVariants: [] })
    expect(tabs).toHaveLength(1)
    expect(tabs[0].snippet).toEqual(legacy)
  })
})

describe('nextTabIndex (keyboard tablist model)', () => {
  it('ArrowRight/ArrowDown advance and wrap to the start', () => {
    expect(nextTabIndex(0, 'ArrowRight', 3)).toBe(1)
    expect(nextTabIndex(2, 'ArrowRight', 3)).toBe(0)
    expect(nextTabIndex(1, 'ArrowDown', 3)).toBe(2)
  })

  it('ArrowLeft/ArrowUp retreat and wrap to the end', () => {
    expect(nextTabIndex(0, 'ArrowLeft', 3)).toBe(2)
    expect(nextTabIndex(2, 'ArrowUp', 3)).toBe(1)
  })

  it('Home and End jump to the extremes', () => {
    expect(nextTabIndex(2, 'Home', 3)).toBe(0)
    expect(nextTabIndex(0, 'End', 3)).toBe(2)
  })

  it('leaves the index unchanged for non-navigation keys', () => {
    expect(nextTabIndex(1, 'Enter', 3)).toBe(1)
    expect(nextTabIndex(1, 'a', 3)).toBe(1)
  })
})

describe('stackLabel', () => {
  it('maps known languages and falls back to the raw value', () => {
    expect(stackLabel('ts')).toBe('TypeScript')
    expect(stackLabel('PHP')).toBe('PHP')
    expect(stackLabel('elixir')).toBe('elixir')
    expect(stackLabel('')).toBe('Code')
  })
})
