import { describe, expect, it } from 'vitest'
import {
  levelSchema,
  normalizeSecureCode,
  parseLevel,
  safeParseLevel,
  secureSnippetSchema,
  sqlCellSchema,
  winConditionSchema,
  type Level,
  type SecureSnippet,
} from '@/lib/schema/level'

// A minimal-but-complete canonical Level (docs/01-architecture.md §4). Engine
// tests reuse richer fixtures; here we only exercise the validation gate.
function validLevel(): Level {
  return {
    schemaVersion: 1,
    id: 'sample',
    order: 1,
    job: 'Sample Job',
    title: 'Sample',
    technique: 'auth-bypass',
    difficulty: 'intro',
    brief: { handler: 'The Fixer', text: 'Get in.', objective: 'Log in as admin.' },
    debrief: {
      explanation: 'Raw string concat.',
      vulnerableCode: { language: 'ts', code: 'q = "..." + input' },
      secureCode: { language: 'ts', code: 'db.prepare(q).bind(input)' },
      takeaway: 'Parameterize.',
    },
    target: {
      appName: 'AcmeCorp Admin',
      surface: 'login-form',
      fields: [
        { name: 'username', label: 'Username', type: 'text' },
        { name: 'password', label: 'Password', type: 'password' },
      ],
    },
    database: {
      schemaSql: 'CREATE TABLE users(id INTEGER PRIMARY KEY, username TEXT);',
      seedSql: "INSERT INTO users(username) VALUES ('admin');",
      visibleSchema: [{ table: 'users', columns: ['id', 'username'] }],
    },
    query: {
      template: "SELECT id FROM users WHERE username = '{{input:username}}'",
      description: 'login check',
    },
    winCondition: { type: 'rows-returned', min: 1 },
    hints: [{ id: 'h1', text: 'Look at the quote.' }],
    expectedSolution: { inputs: { username: "' OR '1'='1' -- ", password: 'x' } },
  }
}

describe('level schema — validation gate', () => {
  it('accepts a valid canonical level', () => {
    const level = parseLevel(validLevel())
    expect(level.id).toBe('sample')
    expect(level.target.surface).toBe('login-form')
  })

  it('rejects a wrong schemaVersion (build/dev gate throws)', () => {
    const bad = { ...validLevel(), schemaVersion: 2 }
    expect(() => parseLevel(bad)).toThrow()
  })

  it('rejects an unknown surface kind', () => {
    const bad = { ...validLevel(), target: { ...validLevel().target, surface: 'carrier-pigeon' } }
    expect(safeParseLevel(bad).success).toBe(false)
  })

  it('rejects an unknown technique id', () => {
    const bad = { ...validLevel(), technique: 'telepathy' }
    expect(safeParseLevel(bad).success).toBe(false)
  })

  it('rejects a level missing a required field', () => {
    const bad = { ...validLevel() } as Record<string, unknown>
    delete bad.winCondition
    expect(safeParseLevel(bad).success).toBe(false)
  })

  it('safeParseLevel returns success for a valid level', () => {
    expect(safeParseLevel(validLevel()).success).toBe(true)
  })
})

describe('SqlCell schema', () => {
  it('accepts string, number, and null', () => {
    expect(sqlCellSchema.parse('LOOT-1')).toBe('LOOT-1')
    expect(sqlCellSchema.parse(42)).toBe(42)
    expect(sqlCellSchema.parse(null)).toBeNull()
  })

  it('rejects a boolean', () => {
    expect(sqlCellSchema.safeParse(true).success).toBe(false)
  })
})

describe('WinCondition DSL — discriminated union', () => {
  it('parses rows-returned with optional max', () => {
    expect(winConditionSchema.parse({ type: 'rows-returned', min: 1, max: 5 })).toMatchObject({
      type: 'rows-returned',
      min: 1,
      max: 5,
    })
  })

  it('parses flag-in-result with optional column', () => {
    const cond = winConditionSchema.parse({ type: 'flag-in-result', flag: 'LOOT-X', column: 'ref' })
    expect(cond).toMatchObject({ type: 'flag-in-result', flag: 'LOOT-X', column: 'ref' })
  })

  it('parses row-match with expect array + mode', () => {
    const cond = winConditionSchema.parse({
      type: 'row-match',
      expect: [{ is_admin: 1 }],
      mode: 'subset',
    })
    expect(cond).toMatchObject({ type: 'row-match', mode: 'subset' })
  })

  it('rejects an unknown win-condition type', () => {
    expect(winConditionSchema.safeParse({ type: 'coin-flip' }).success).toBe(false)
  })

  it('rejects row-match with a missing mode', () => {
    expect(winConditionSchema.safeParse({ type: 'row-match', expect: [{ a: 1 }] }).success).toBe(false)
  })

  it('parses the WS3 win types (error-based / blind-boolean / blind-timing / stacked-queries)', () => {
    expect(winConditionSchema.parse({ type: 'error-based', errorContains: 'no such' })).toMatchObject({
      type: 'error-based',
    })
    expect(winConditionSchema.parse({ type: 'blind-boolean' })).toMatchObject({ type: 'blind-boolean' })
    expect(winConditionSchema.parse({ type: 'blind-timing' })).toMatchObject({ type: 'blind-timing' })
    expect(winConditionSchema.parse({ type: 'stacked-queries', minResultSets: 2 })).toMatchObject({
      type: 'stacked-queries',
      minResultSets: 2,
    })
  })
})

describe('WS3 techniqueId — extended vocabulary', () => {
  it('accepts the five new post-MVP technique ids', () => {
    for (const technique of [
      'error-based',
      'blind-boolean',
      'blind-timing',
      'stacked-queries',
      'waf-bypass',
    ] as const) {
      expect(safeParseLevel({ ...validLevel(), technique }).success).toBe(true)
    }
  })
})

describe('WS3 inputFilter — optional WAF on query', () => {
  it('is absent by default (existing levels unaffected)', () => {
    expect(parseLevel(validLevel()).query.inputFilter).toBeUndefined()
  })

  it('accepts reject/strip filters with a blocklist', () => {
    const level = validLevel()
    for (const mode of ['reject', 'strip'] as const) {
      const withFilter = {
        ...level,
        query: { ...level.query, inputFilter: { blocklist: ['UNION'], mode, message: 'blocked' } },
      }
      expect(safeParseLevel(withFilter).success).toBe(true)
    }
  })

  it('rejects an empty blocklist and an unknown mode', () => {
    const level = validLevel()
    expect(
      safeParseLevel({ ...level, query: { ...level.query, inputFilter: { blocklist: [], mode: 'reject' } } })
        .success,
    ).toBe(false)
    expect(
      safeParseLevel({
        ...level,
        query: { ...level.query, inputFilter: { blocklist: ['x'], mode: 'nuke' } },
      }).success,
    ).toBe(false)
  })
})

describe('levelSchema is the exported Zod object', () => {
  it('exposes safeParse', () => {
    expect(typeof levelSchema.safeParse).toBe('function')
  })
})

describe('WS2 secure-code — per-stack, back-compatible', () => {
  it('accepts a level with no variants (legacy object form stays valid)', () => {
    expect(safeParseLevel(validLevel()).success).toBe(true)
  })

  it('accepts an optional per-stack secureCodeVariants array', () => {
    const level = validLevel()
    const withVariants = {
      ...level,
      debrief: {
        ...level.debrief,
        secureCodeVariants: [
          { id: 'node', label: 'Node (pg)', language: 'ts', code: 'client.query(q, [u])' },
          { id: 'php', label: 'PHP (PDO)', language: 'php', code: '$stmt->execute([$u])' },
        ],
      },
    }
    expect(safeParseLevel(withVariants).success).toBe(true)
  })

  it('rejects an empty secureCodeVariants array (min 1)', () => {
    const level = validLevel()
    const bad = { ...level, debrief: { ...level.debrief, secureCodeVariants: [] } }
    expect(safeParseLevel(bad).success).toBe(false)
  })

  it('secureSnippetSchema requires id/label/language/code', () => {
    expect(secureSnippetSchema.safeParse({ id: 'x', label: 'X', language: 'ts', code: 'y' }).success).toBe(true)
    expect(secureSnippetSchema.safeParse({ language: 'ts', code: 'y' }).success).toBe(false)
  })
})

describe('WS2 vulnerable-code — per-stack, back-compatible (mirrors secure side)', () => {
  it('accepts a level with no vulnerableCodeVariants (legacy single-snippet form stays valid)', () => {
    expect(safeParseLevel(validLevel()).success).toBe(true)
  })

  it('accepts an optional per-stack vulnerableCodeVariants array', () => {
    const level = validLevel()
    const withVariants = {
      ...level,
      debrief: {
        ...level.debrief,
        vulnerableCodeVariants: [
          { id: 'node', label: 'Node (pg)', language: 'ts', code: `query("... " + u)` },
          { id: 'php', label: 'PHP (raw)', language: 'php', code: '"... " . $u' },
        ],
      },
    }
    expect(safeParseLevel(withVariants).success).toBe(true)
  })

  it('rejects an empty vulnerableCodeVariants array (min 1)', () => {
    const level = validLevel()
    const bad = { ...level, debrief: { ...level.debrief, vulnerableCodeVariants: [] } }
    expect(safeParseLevel(bad).success).toBe(false)
  })
})

describe('normalizeSecureCode — collapses both forms to SecureSnippet[]', () => {
  it('legacy object -> a single default snippet', () => {
    const result = normalizeSecureCode({ language: 'ts', code: 'db.prepare(q).bind(x)' })
    expect(result).toEqual([
      { id: 'default', label: 'Secure', language: 'ts', code: 'db.prepare(q).bind(x)' },
    ])
  })

  it('array -> passes through unchanged (as-is)', () => {
    const variants: SecureSnippet[] = [
      { id: 'node', label: 'Node', language: 'ts', code: 'a' },
      { id: 'py', label: 'Python', language: 'py', code: 'b' },
    ]
    expect(normalizeSecureCode(variants)).toBe(variants)
  })

  it('models the call-site (secureCodeVariants ?? secureCode)', () => {
    const secureCode = { language: 'ts', code: 'legacy' }
    const secureCodeVariants: SecureSnippet[] | undefined = undefined
    expect(normalizeSecureCode(secureCodeVariants ?? secureCode)).toHaveLength(1)
  })
})
