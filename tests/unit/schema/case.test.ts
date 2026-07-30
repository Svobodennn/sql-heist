import { describe, expect, it } from 'vitest'
import { parseCase, safeParseCase } from '@/lib/schema/case'

// A minimal valid objective; overrides let each test bend one field.
const objective = (over: Record<string, unknown> = {}) => ({
  id: 'o1',
  order: 1,
  goal: 'Get inside as an admin.',
  why: 'The ledger lives behind the login.',
  doneWhen: 'An admin row comes back.',
  technique: 'auth-bypass',
  difficulty: 'intro',
  surface: 'login-form',
  fields: [{ name: 'username', label: 'User', type: 'text' }],
  query: { template: "SELECT id, is_admin FROM users WHERE username = '{{input:username}}'" },
  winCondition: { type: 'rows-returned', min: 1 },
  hints: [],
  expectedSolution: { inputs: { username: "' OR '1'='1' -- " } },
  debrief: {
    explanation: 'Input was concatenated into the SQL.',
    vulnerableCode: { language: 'js', code: 'const sql = "... " + username' },
    secureCode: { language: 'js', code: 'db.prepare("... = ?").get(username)' },
    takeaway: 'Bind the value.',
  },
  ...over,
})

const validCase = {
  schemaVersion: 1,
  id: 'front-door',
  number: '001',
  title: 'The Front Door',
  briefing: { handler: 'The Fixer', text: 'Break into Meridian, one door at a time.' },
  target: { appName: 'Meridian Holdings' },
  database: {
    schemaSql: 'CREATE TABLE users (id INTEGER, is_admin INTEGER)',
    seedSql: 'INSERT INTO users VALUES (1, 1)',
    visibleSchema: [{ table: 'users', columns: ['id', 'is_admin'] }],
  },
  objectives: [objective({ id: 'o1', order: 1 }), objective({ id: 'o2', order: 2 })],
  caseClosed: { headline: "YOU'RE IN.", fixer: 'Clean work.' },
}

describe('case schema', () => {
  it('parses a valid case', () => {
    const c = parseCase(validCase)
    expect(c.number).toBe('001')
    expect(c.objectives).toHaveLength(2)
    expect(c.objectives[0].goal.length).toBeGreaterThan(0)
  })

  it('rejects a case with zero objectives', () => {
    expect(safeParseCase({ ...validCase, objectives: [] }).success).toBe(false)
  })

  it('rejects duplicate objective ids', () => {
    const dup = { ...validCase, objectives: [objective({ id: 'same' }), objective({ id: 'same' })] }
    expect(safeParseCase(dup).success).toBe(false)
  })

  it('requires goal / why / doneWhen on every objective', () => {
    for (const field of ['goal', 'why', 'doneWhen']) {
      const bad = { ...validCase, objectives: [objective({ [field]: '' })] }
      expect(safeParseCase(bad).success, `${field} must be required`).toBe(false)
    }
  })
})
