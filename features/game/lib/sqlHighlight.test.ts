import { describe, expect, it } from 'vitest'
import { classifyChars, toRuns, type CharStyle } from './sqlHighlight'

// The tokenizer is purely cosmetic, but the comment tail is load-bearing
// pedagogy: the player must SEE the password check get commented out.
describe('sqlHighlight.classifyChars', () => {
  const kindsAt = (sql: string, styles: CharStyle[], substr: string) => {
    const at = sql.indexOf(substr)
    return styles.slice(at, at + substr.length).map((s) => s.kind)
  }

  it('marks everything after -- as a commented tail (to end of line)', () => {
    const sql = "SELECT 1 -- ' AND password = 'x'"
    const styles = classifyChars(sql)
    const commentStart = sql.indexOf('--')
    for (let i = commentStart; i < sql.length; i++) {
      expect(styles[i].comment).toBe(true)
      expect(styles[i].kind).toBe('comment')
    }
    // ...and the head is NOT comment.
    expect(styles[0].comment).toBe(false)
  })

  it('colors keywords, strings and numbers distinctly', () => {
    const sql = "SELECT id FROM users WHERE price = 340 AND name = 'x'"
    const styles = classifyChars(sql)
    expect(kindsAt(sql, styles, 'SELECT')).toEqual(Array(6).fill('keyword'))
    expect(kindsAt(sql, styles, '340')).toEqual(['number', 'number', 'number'])
    expect(styles[sql.indexOf("'x'")].kind).toBe('string')
  })

  it('handles the classic tautology payload without breaking', () => {
    const sql = "SELECT id FROM users WHERE username = '' OR '1'='1' -- ' AND password = 'x'"
    const styles = classifyChars(sql)
    expect(styles).toHaveLength(sql.length)
    const dashDash = sql.indexOf('--')
    expect(styles[dashDash].comment).toBe(true)
    // OR keyword before the comment stays live.
    expect(styles[sql.indexOf(' OR ') + 1].kind).toBe('keyword')
  })

  it('block comments /* */ are dimmed', () => {
    const sql = 'SELECT 1 /* hidden */ FROM t'
    const styles = classifyChars(sql)
    const start = sql.indexOf('/*')
    const end = sql.indexOf('*/') + 2
    for (let i = start; i < end; i++) expect(styles[i].comment).toBe(true)
    expect(styles[sql.indexOf('FROM')].comment).toBe(false)
  })
})

describe('sqlHighlight.toRuns', () => {
  it('groups contiguous identical styles into single runs', () => {
    const text = "OR '1'"
    const runs = toRuns(text, classifyChars(text))
    expect(runs.map((r) => r.text).join('')).toBe(text)
    // "OR" keyword, space, then string — at least 3 runs, none empty.
    expect(runs.length).toBeGreaterThanOrEqual(3)
    expect(runs.every((r) => r.text.length > 0)).toBe(true)
  })
})
