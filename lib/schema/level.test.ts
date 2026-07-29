import { describe, expect, it } from 'vitest'
import {
  levelSchema,
  parseLevel,
  safeParseLevel,
  sqlCellSchema,
  winConditionSchema,
  type Level,
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
})

describe('levelSchema is the exported Zod object', () => {
  it('exposes safeParse', () => {
    expect(typeof levelSchema.safeParse).toBe('function')
  })
})
