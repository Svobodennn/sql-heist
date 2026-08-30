import { describe, expect, it } from 'vitest'
import { highlightCode, type CodeLine, type CodeTokenKind } from '@/features/game/lib/codeHighlight'

function sourceOf(lines: readonly CodeLine[]): string {
  return lines.map((line) => line.map((token) => token.text).join('')).join('\n')
}

function kindsOf(lines: readonly CodeLine[]): Set<CodeTokenKind> {
  return new Set(lines.flatMap((line) => line.map((token) => token.kind)))
}

const LANGUAGE_CASES: ReadonlyArray<{
  language: string
  source: string
  expectedKinds: CodeTokenKind[]
}> = [
  {
    language: 'js',
    source: '// note\nconst rows = await client.query("safe", 2)',
    expectedKinds: ['comment', 'keyword', 'variable', 'function', 'string', 'number'],
  },
  {
    language: 'python',
    source: '# note\ndef lookup(value):\n    return f"{value}"',
    expectedKinds: ['comment', 'keyword', 'function', 'variable', 'string'],
  },
  {
    language: 'php',
    source: '// note\n$stmt = new PDO("dsn");\n$stmt->execute([$value]);',
    expectedKinds: ['comment', 'keyword', 'variable', 'type', 'function', 'string'],
  },
  {
    language: 'java',
    source: '// note\nPreparedStatement ps = connection.prepareStatement("SELECT", 1);',
    expectedKinds: ['comment', 'type', 'variable', 'function', 'string', 'number'],
  },
  {
    language: 'csharp',
    source: '// note\nusing var cmd = new SqlCommand("SELECT", connection);',
    expectedKinds: ['comment', 'keyword', 'type', 'variable', 'string'],
  },
  {
    language: 'go',
    source: '// note\nvar row = db.QueryRow("SELECT", 1)',
    expectedKinds: ['comment', 'keyword', 'variable', 'function', 'string', 'number'],
  },
  {
    language: 'ruby',
    source: '# note\nuser = User.where("name = ?", value)\nreturn nil',
    expectedKinds: ['comment', 'keyword', 'type', 'variable', 'function', 'string'],
  },
]

describe('highlightCode', () => {
  it.each(LANGUAGE_CASES)(
    'keeps $language source lossless and classifies its syntax',
    ({ language, source, expectedKinds }) => {
      const lines = highlightCode(source, language)
      const kinds = kindsOf(lines)

      expect(sourceOf(lines)).toBe(source)
      expectedKinds.forEach((kind) => expect(kinds.has(kind)).toBe(true))
    },
  )

  it('keeps multiline comments classified across line boundaries', () => {
    const source = 'const value = /* first line\nsecond line */ query("safe")'
    const lines = highlightCode(source, 'js')
    const comments = lines.flatMap((line) => line.filter((token) => token.kind === 'comment'))

    expect(sourceOf(lines)).toBe(source)
    expect(comments.map((token) => token.text).join('\n')).toBe('/* first line\nsecond line */')
  })

  it('falls back to plain, lossless text for an unknown language', () => {
    const source = 'custom.syntax(value)'
    const lines = highlightCode(source, 'custom')

    expect(sourceOf(lines)).toBe(source)
    expect(kindsOf(lines)).toEqual(new Set(['plain']))
  })
})
