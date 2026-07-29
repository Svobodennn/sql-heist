// PURELY VISUAL SQL tokenizer for <SqlPreview> (docs/04-frontend-ux.md §5.2).
//
// IMPORTANT boundary: this does NOT decide static-vs-injected — that split comes
// from the engine's ComposedSegment[] (composer-correct, never guessed). This
// module only adds the *cosmetic* layer the doc explicitly allows as "a light SQL
// tokenizer (visual only)": keyword / string / number coloring and, above all,
// the comment tail (`--`, `/* */`) so the player SEES the password check get
// commented out. It classifies per-character so the caller can intersect the
// classification with the engine segments by offset. Never throws on malformed
// (injection-broken) SQL — worst case is slightly-off coloring, never a crash.

export type TokenKind = 'keyword' | 'string' | 'number' | 'comment' | 'punct' | 'plain'

export interface CharStyle {
  kind: TokenKind
  comment: boolean
}

const KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'NULL', 'UNION', 'ALL',
  'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'LIKE', 'IN', 'IS',
  'AS', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'INSERT', 'INTO',
  'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'DISTINCT',
  'COUNT', 'EXISTS', 'BETWEEN', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'ASC', 'DESC', 'PRAGMA',
])

const isDigit = (c: string) => c >= '0' && c <= '9'
const isWordStart = (c: string) => /[A-Za-z_]/.test(c)
const isWord = (c: string) => /[A-Za-z0-9_]/.test(c)

export function classifyChars(sql: string): CharStyle[] {
  const out: CharStyle[] = new Array(sql.length)
  const n = sql.length
  let i = 0

  const fill = (from: number, to: number, kind: TokenKind, comment = false) => {
    for (let k = from; k < to; k++) out[k] = { kind, comment }
  }

  while (i < n) {
    const c = sql[i]

    // Line comment: `--` to end of line (or end of string).
    if (c === '-' && sql[i + 1] === '-') {
      let j = i
      while (j < n && sql[j] !== '\n') j++
      fill(i, j, 'comment', true)
      i = j
      continue
    }

    // Block comment: `/* ... */` (unterminated runs to end).
    if (c === '/' && sql[i + 1] === '*') {
      let j = i + 2
      while (j < n && !(sql[j] === '*' && sql[j + 1] === '/')) j++
      const end = j < n ? j + 2 : n
      fill(i, end, 'comment', true)
      i = end
      continue
    }

    // Single-quoted string with '' escape. Unterminated (injection break-out)
    // simply runs to the end — that IS what happens on the wire.
    if (c === "'") {
      let j = i + 1
      while (j < n) {
        if (sql[j] === "'") {
          if (sql[j + 1] === "'") {
            j += 2
            continue
          }
          j++
          break
        }
        j++
      }
      fill(i, j, 'string')
      i = j
      continue
    }

    if (isDigit(c)) {
      let j = i
      while (j < n && (isDigit(sql[j]) || sql[j] === '.')) j++
      fill(i, j, 'number')
      i = j
      continue
    }

    if (isWordStart(c)) {
      let j = i
      while (j < n && isWord(sql[j])) j++
      const kind: TokenKind = KEYWORDS.has(sql.slice(i, j).toUpperCase()) ? 'keyword' : 'plain'
      fill(i, j, kind)
      i = j
      continue
    }

    // Operators / punctuation vs whitespace.
    out[i] = { kind: /[=<>!|&%*/,;().+-]/.test(c) ? 'punct' : 'plain', comment: false }
    i++
  }

  return out
}

// Group a per-character classification slice into contiguous runs of identical
// style. <SqlPreview> renders one <span> per run — minimal DOM, stable coloring.
export interface StyleRun {
  text: string
  kind: TokenKind
  comment: boolean
}

export function toRuns(text: string, styles: CharStyle[]): StyleRun[] {
  const runs: StyleRun[] = []
  for (let i = 0; i < text.length; i++) {
    const s = styles[i] ?? { kind: 'plain', comment: false }
    const last = runs[runs.length - 1]
    if (last && last.kind === s.kind && last.comment === s.comment) {
      last.text += text[i]
    } else {
      runs.push({ text: text[i], kind: s.kind, comment: s.comment })
    }
  }
  return runs
}
