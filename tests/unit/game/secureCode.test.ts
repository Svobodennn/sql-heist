import { describe, expect, it } from 'vitest'
import type { CodeSnippet, SecureSnippet } from '@/lib/schema/level'
import {
  selectSecureSnippets,
  selectVulnerableSnippets,
  nextTabIndex,
  groupSecureSnippets,
  shortFrameworkLabel,
  languageName,
} from '@/features/game/lib/secureCode'

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

describe('selectVulnerableSnippets (mirrors the secure side)', () => {
  it('prefers vulnerableCodeVariants when present, preserving order and labels', () => {
    const tabs = selectVulnerableSnippets({ vulnerableCode: legacy, vulnerableCodeVariants: variants })
    expect(tabs.map((t) => t.stack)).toEqual(['Node.js', 'Python', 'PHP'])
    expect(tabs[2].snippet).toEqual({ language: 'php', code: '$stmt->execute([$u, $p]);' })
  })

  it('falls back to the single vulnerableCode when variants are absent (1 tab)', () => {
    const tabs = selectVulnerableSnippets({ vulnerableCode: legacy })
    expect(tabs).toHaveLength(1)
    // The fold label ('Secure') is unused for a lone snippet — no tabs render.
    expect(tabs[0].snippet).toEqual(legacy)
  })
})

// Mirrors what the shipped levels carry: 7 languages, three of them multi-driver,
// deliberately interleaved to prove grouping preserves first-appearance order.
const shipped: SecureSnippet[] = [
  { id: 'node', label: 'Node.js (pg / mysql2)', language: 'js', code: 'a' },
  { id: 'python', label: 'Python (sqlite3 / psycopg2)', language: 'python', code: 'b' },
  { id: 'php-pdo', label: 'PHP (PDO)', language: 'php', code: 'c' },
  { id: 'java-jdbc', label: 'Java (JDBC)', language: 'java', code: 'd' },
  { id: 'dotnet', label: 'C# / .NET (ADO.NET)', language: 'csharp', code: 'e' },
  { id: 'go', label: 'Go (database/sql)', language: 'go', code: 'f' },
  { id: 'rails', label: 'Ruby on Rails (ActiveRecord)', language: 'ruby', code: 'g' },
  { id: 'laravel', label: 'Laravel (Query Builder)', language: 'php', code: 'h' },
  { id: 'django', label: 'Django (ORM)', language: 'python', code: 'i' },
  { id: 'spring', label: 'Spring Boot (JdbcTemplate)', language: 'java', code: 'j' },
]

describe('groupSecureSnippets (two-level language -> framework)', () => {
  const tabs = selectSecureSnippets({ secureCode: legacy, secureCodeVariants: shipped })

  it('groups by language in first-appearance order (never a sort)', () => {
    const groups = groupSecureSnippets(tabs)
    expect(groups.map((g) => g.language)).toEqual([
      'js',
      'python',
      'php',
      'java',
      'csharp',
      'go',
      'ruby',
    ])
    expect(groups.map((g) => g.name)).toEqual([
      'JavaScript',
      'Python',
      'PHP',
      'Java',
      'C#',
      'Go',
      'Ruby',
    ])
  })

  it('keeps every driver under its language, in data order, with short labels', () => {
    const groups = groupSecureSnippets(tabs)
    const php = groups.find((g) => g.language === 'php')!
    expect(php.options.map((o) => o.shortLabel)).toEqual(['PDO', 'Laravel'])
    const python = groups.find((g) => g.language === 'python')!
    expect(python.options.map((o) => o.shortLabel)).toEqual(['sqlite3 / psycopg2', 'Django'])
    const java = groups.find((g) => g.language === 'java')!
    expect(java.options.map((o) => o.shortLabel)).toEqual(['JDBC', 'Spring Boot'])
  })

  it('marks single-driver languages so the UI can skip level 2', () => {
    const groups = groupSecureSnippets(tabs)
    const multi = groups.filter((g) => g.options.length > 1).map((g) => g.language)
    expect(multi).toEqual(['python', 'php', 'java'])
    expect(groups.find((g) => g.language === 'js')!.options).toHaveLength(1)
  })

  it('folds a legacy single snippet into one group with one option', () => {
    const groups = groupSecureSnippets(selectSecureSnippets({ secureCode: legacy }))
    expect(groups).toHaveLength(1)
    expect(groups[0].options).toHaveLength(1)
    expect(groups[0].options[0].snippet).toEqual(legacy)
  })

  it('falls back to a capitalized code for unknown languages', () => {
    expect(languageName('elixir')).toBe('Elixir')
    const groups = groupSecureSnippets([{ stack: 'Ecto', snippet: { language: 'elixir', code: 'z' } }])
    expect(groups[0].name).toBe('Elixir')
  })
})

describe('shortFrameworkLabel', () => {
  it('strips a redundant language prefix and unwraps its parenthetical', () => {
    expect(shortFrameworkLabel('PHP (PDO)', 'PHP')).toBe('PDO')
    expect(shortFrameworkLabel('Java (JDBC)', 'Java')).toBe('JDBC')
    expect(shortFrameworkLabel('Python (sqlite3 / psycopg2)', 'Python')).toBe('sqlite3 / psycopg2')
  })

  it('keeps a real framework name and drops its trailing qualifier', () => {
    expect(shortFrameworkLabel('Laravel (Query Builder)', 'PHP')).toBe('Laravel')
    expect(shortFrameworkLabel('Django (ORM)', 'Python')).toBe('Django')
    expect(shortFrameworkLabel('Spring Boot (JdbcTemplate)', 'Java')).toBe('Spring Boot')
  })

  it('returns the label unchanged when there is nothing to strip', () => {
    expect(shortFrameworkLabel('Secure', 'Secure')).toBe('Secure')
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
