import { describe, expect, it } from 'vitest'
import type { CodeSnippet, SecureSnippet } from '@/lib/schema/level'
import { selectSecureSnippets, nextTabIndex } from './secureCode'

// Legacy: a single secure snippet (what a level ships without per-stack variants).
const legacy: CodeSnippet = { language: 'js', code: 'db.prepare(sql).get(user, pass)' }

// Per-stack variants in the engine's canonical SecureSnippet shape, deliberately
// out of alphabetical order to prove tab order follows the data, not a sort.
const variants: SecureSnippet[] = [
  { id: 'node', label: 'Node.js', language: 'js', code: 'const row = db.prepare(q).get(u, p)' },
  { id: 'python', label: 'Python', language: 'py', code: 'cur.execute(q, (u, p))' },
  { id: 'php-pdo', label: 'PHP', language: 'php', code: '$stmt->execute([$u, $p]);' },
]

describe('selectSecureSnippets (merge-order independent)', () => {
  it('prefers secureCodeVariants when present, preserving order and labels', () => {
    const tabs = selectSecureSnippets({ secureCode: legacy, secureCodeVariants: variants })
    expect(tabs.map((t) => t.stack)).toEqual(['Node.js', 'Python', 'PHP'])
    expect(tabs[1].snippet).toEqual({ language: 'py', code: 'cur.execute(q, (u, p))' })
  })

  it('falls back to the single secureCode when variants are absent (1 tab)', () => {
    const tabs = selectSecureSnippets({ secureCode: legacy })
    expect(tabs).toHaveLength(1)
    expect(tabs[0].stack).toBe('Secure')
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
  })
})
