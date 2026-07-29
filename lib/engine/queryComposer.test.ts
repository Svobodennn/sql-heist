import { describe, expect, it } from 'vitest'
import { compose } from '@/lib/engine/queryComposer'

describe('queryComposer.compose — raw injection (vulnerable by design)', () => {
  it('substitutes a token with the RAW value (no escape, no quoting)', () => {
    const result = compose("WHERE name = '{{input:q}}'", { q: "a' OR '1'='1" })
    // The quote is NOT escaped — this is the game's core vulnerability.
    expect(result.sql).toBe("WHERE name = 'a' OR '1'='1'")
  })

  it('composes the K1 login-bypass shape verbatim (tautology + comment)', () => {
    const template =
      "SELECT id, username, is_admin FROM users WHERE username = '{{input:username}}' AND password = '{{input:password}}'"
    const result = compose(template, { username: "' OR '1'='1' -- ", password: 'x' })
    expect(result.sql).toBe(
      "SELECT id, username, is_admin FROM users WHERE username = '' OR '1'='1' -- ' AND password = 'x'",
    )
  })

  it('replaces every occurrence of a repeated token', () => {
    const result = compose('{{input:x}}-{{input:x}}', { x: 'AB' })
    expect(result.sql).toBe('AB-AB')
  })

  it('injects a value containing a destructive stacked payload untouched', () => {
    const result = compose("q='{{input:q}}'", { q: "'; DROP TABLE users; --" })
    expect(result.sql).toBe("q=''; DROP TABLE users; --'")
  })
})

describe('queryComposer.compose — purity', () => {
  it('is deterministic and does not mutate the inputs object', () => {
    const inputs = { q: 'foo' }
    const frozen = Object.freeze({ ...inputs })
    const a = compose("x='{{input:q}}'", frozen)
    const b = compose("x='{{input:q}}'", frozen)
    expect(a.sql).toBe(b.sql)
    expect(inputs).toEqual({ q: 'foo' })
  })

  it('echoes the original template and inputs for debrief/telemetry', () => {
    const template = "x='{{input:q}}'"
    const inputs = { q: 'foo' }
    const result = compose(template, inputs)
    expect(result.template).toBe(template)
    expect(result.inputs).toEqual(inputs)
  })
})

describe('queryComposer.compose — unresolved tokens', () => {
  it('leaves an unfilled token literal in sql and records it in unresolved', () => {
    const result = compose("u='{{input:username}}' p='{{input:password}}'", { username: 'admin' })
    expect(result.sql).toBe("u='admin' p='{{input:password}}'")
    expect(result.unresolved).toEqual(['password'])
  })

  it('treats an empty-string input as resolved (not unresolved)', () => {
    const result = compose("q='{{input:q}}'", { q: '' })
    expect(result.sql).toBe("q=''")
    expect(result.unresolved).toEqual([])
  })

  it('deduplicates repeated unresolved token names (first-appearance order)', () => {
    const result = compose('{{input:a}}{{input:b}}{{input:a}}', {})
    expect(result.unresolved).toEqual(['a', 'b'])
  })
})

describe('queryComposer.compose — segment exposure (composer-correct, not regex)', () => {
  it('marks static vs injected segments and preserves field + value', () => {
    const result = compose("name='{{input:q}}'", { q: "a' OR 1=1" })
    expect(result.segments).toEqual([
      { kind: 'static', text: "name='" },
      { kind: 'injected', field: 'q', value: "a' OR 1=1" },
      { kind: 'static', text: "'" },
    ])
  })

  it('reconstructs the exact composed sql by concatenating segments', () => {
    const template =
      "SELECT id, name, price FROM products WHERE name LIKE '%{{input:q}}%'"
    const result = compose(template, { q: "' UNION SELECT a,b,c -- " })
    const rebuilt = result.segments
      .map((s) => (s.kind === 'injected' ? s.value : s.text))
      .join('')
    expect(rebuilt).toBe(result.sql)
  })

  it('returns a single static segment when there are no tokens', () => {
    const result = compose('SELECT 1', {})
    expect(result.segments).toEqual([{ kind: 'static', text: 'SELECT 1' }])
    expect(result.unresolved).toEqual([])
  })
})
