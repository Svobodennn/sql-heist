export type CodeTokenKind =
  | 'keyword'
  | 'string'
  | 'number'
  | 'comment'
  | 'operator'
  | 'type'
  | 'function'
  | 'variable'
  | 'plain'

export interface CodeToken {
  readonly text: string
  readonly kind: CodeTokenKind
}

export type CodeLine = readonly CodeToken[]

interface Grammar {
  readonly lineComments: readonly string[]
  readonly blockComments: boolean
  readonly quotes: readonly string[]
  readonly keywords: ReadonlySet<string>
  readonly types: ReadonlySet<string>
  readonly caseInsensitive?: boolean
}

const wordSet = (words: string) => new Set(words.split(/\s+/).filter(Boolean))

const GRAMMARS: Readonly<Record<string, Grammar>> = {
  js: {
    lineComments: ['//'],
    blockComments: true,
    quotes: ["'", '"', '`'],
    keywords: wordSet(
      'async await break case catch class const continue debugger default delete do else export extends false finally for from function get if import in instanceof let new null of return set static super switch this throw true try typeof undefined var void while with yield',
    ),
    types: wordSet(
      'Array BigInt Boolean Buffer Date Error Map Number Object Promise RegExp Set String Symbol URL',
    ),
  },
  python: {
    lineComments: ['#'],
    blockComments: false,
    quotes: ["'", '"'],
    keywords: wordSet(
      'and as assert async await break class continue def del elif else except false finally for from global if import in is lambda none nonlocal not or pass raise return true try while with yield',
    ),
    types: wordSet('bool bytes dict Exception float int list object set str tuple'),
    caseInsensitive: true,
  },
  php: {
    lineComments: ['//', '#'],
    blockComments: true,
    quotes: ["'", '"'],
    keywords: wordSet(
      'and array as break callable case catch class clone const continue declare default die do echo else elseif empty extends false final finally fn for foreach function global goto if implements include include_once instanceof interface isset list match namespace new null or print private protected public readonly require require_once return static switch throw trait true try unset use var while xor yield',
    ),
    types: wordSet('closure datetime db exception pdo pdostatement throwable'),
    caseInsensitive: true,
  },
  java: {
    lineComments: ['//'],
    blockComments: true,
    quotes: ["'", '"'],
    keywords: wordSet(
      'abstract assert boolean break byte case catch char class const continue default do double else enum extends false final finally float for goto if implements import instanceof int interface long native new null package private protected public record return sealed short static strictfp super switch synchronized this throw throws transient true try var void volatile while',
    ),
    types: wordSet(
      'Boolean Integer List Long Map Optional PreparedStatement ResultSet Set Statement String',
    ),
  },
  csharp: {
    lineComments: ['//'],
    blockComments: true,
    quotes: ["'", '"'],
    keywords: wordSet(
      'abstract as async await base bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach goto if implicit in init int interface internal is lock long namespace new null object operator out override params private protected public readonly record ref required return sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using var virtual void volatile while',
    ),
    types: wordSet('Dictionary List SqlCommand SqlDataReader SqlParameter String Task'),
  },
  go: {
    lineComments: ['//'],
    blockComments: true,
    quotes: ["'", '"', '`'],
    keywords: wordSet(
      'break case chan const continue default defer else fallthrough false for func go goto if import interface iota map nil package range return select struct switch true type var',
    ),
    types: wordSet('Context DB Row Rows bool byte error float64 int int64 rune string'),
  },
  ruby: {
    lineComments: ['#'],
    blockComments: false,
    quotes: ["'", '"'],
    keywords: wordSet(
      'alias and begin break case class def do else elsif end ensure false for if in module next nil not or redo rescue retry return self super then true undef unless until when while yield',
    ),
    types: wordSet('ActiveRecord Array Hash Integer String Symbol'),
  },
}

const isIdentifierStart = (char: string) => /[A-Za-z_$]/.test(char)
const isIdentifierPart = (char: string) => /[A-Za-z0-9_$]/.test(char)
const isDigit = (char: string) => char >= '0' && char <= '9'

function normalizedWord(word: string, grammar: Grammar): string {
  return grammar.caseInsensitive ? word.toLowerCase() : word
}

function quoteStartAt(
  source: string,
  index: number,
  language: string,
  grammar: Grammar,
): number | undefined {
  if (grammar.quotes.includes(source[index])) return index

  if (language === 'python') {
    const prefix = source.slice(index).match(/^[rRuUbBfF]{1,2}(?=['"])/)?.[0]
    if (prefix) return index + prefix.length
  }

  if (language === 'csharp') {
    const prefix = source.slice(index).match(/^(?:\$@|@\$|\$|@)(?=")/)?.[0]
    if (prefix) return index + prefix.length
  }

  return undefined
}

function stringEnd(source: string, quoteIndex: number, language: string): number {
  const quote = source[quoteIndex]
  const triple =
    language === 'python' && source.slice(quoteIndex, quoteIndex + 3) === quote.repeat(3)
  const markerLength = triple ? 3 : 1
  let index = quoteIndex + markerLength

  while (index < source.length) {
    if (source[index] === '\\') {
      index = Math.min(index + 2, source.length)
      continue
    }
    if (triple && source.slice(index, index + 3) === quote.repeat(3)) return index + 3
    if (!triple && source[index] === quote) return index + 1
    index++
  }

  return source.length
}

function lineCommentAt(source: string, index: number, grammar: Grammar): string | undefined {
  return grammar.lineComments.find((marker) => source.startsWith(marker, index))
}

function nextNonWhitespace(source: string, index: number): string {
  let cursor = index
  while (cursor < source.length && /\s/.test(source[cursor])) cursor++
  return source[cursor] ?? ''
}

function tokenKindForWord(
  word: string,
  source: string,
  end: number,
  grammar: Grammar,
): CodeTokenKind {
  const normalized = normalizedWord(word, grammar)
  if (grammar.keywords.has(normalized)) return 'keyword'
  if (grammar.types.has(normalized)) return 'type'
  if (nextNonWhitespace(source, end) === '(') return 'function'
  if (/^[A-Z][A-Za-z0-9_$]*$/.test(word)) return 'type'
  return 'variable'
}

function appendToken(tokens: CodeToken[], text: string, kind: CodeTokenKind): void {
  if (!text) return
  const previous = tokens[tokens.length - 1]
  if (previous?.kind === kind) {
    tokens[tokens.length - 1] = { text: previous.text + text, kind }
    return
  }
  tokens.push({ text, kind })
}

function tokenize(source: string, language: string, grammar: Grammar): CodeToken[] {
  const tokens: CodeToken[] = []
  let index = 0

  while (index < source.length) {
    const commentMarker = lineCommentAt(source, index, grammar)
    if (commentMarker) {
      let end = index + commentMarker.length
      while (end < source.length && source[end] !== '\n') end++
      appendToken(tokens, source.slice(index, end), 'comment')
      index = end
      continue
    }

    if (grammar.blockComments && source.startsWith('/*', index)) {
      const close = source.indexOf('*/', index + 2)
      const end = close === -1 ? source.length : close + 2
      appendToken(tokens, source.slice(index, end), 'comment')
      index = end
      continue
    }

    const quoteIndex = quoteStartAt(source, index, language, grammar)
    if (quoteIndex !== undefined) {
      const end = stringEnd(source, quoteIndex, language)
      appendToken(tokens, source.slice(index, end), 'string')
      index = end
      continue
    }

    const char = source[index]
    if ((language === 'php' && char === '$') || (language === 'ruby' && char === '@')) {
      let end = index + 1
      if (language === 'ruby' && source[end] === '@') end++
      while (end < source.length && isIdentifierPart(source[end])) end++
      if (end > index + 1) {
        appendToken(tokens, source.slice(index, end), 'variable')
        index = end
        continue
      }
    }

    if (isDigit(char)) {
      let end = index + 1
      while (end < source.length && /[A-Fa-f0-9_.xXbBoO]/.test(source[end])) end++
      appendToken(tokens, source.slice(index, end), 'number')
      index = end
      continue
    }

    if (isIdentifierStart(char)) {
      let end = index + 1
      while (end < source.length && isIdentifierPart(source[end])) end++
      const word = source.slice(index, end)
      appendToken(tokens, word, tokenKindForWord(word, source, end, grammar))
      index = end
      continue
    }

    const kind: CodeTokenKind = /[=<>!|&%*/:;,()[\]{}.+\-?~^@]/.test(char) ? 'operator' : 'plain'
    appendToken(tokens, char, kind)
    index++
  }

  return tokens
}

function toLines(tokens: readonly CodeToken[]): CodeLine[] {
  const lines: CodeToken[][] = [[]]
  for (const token of tokens) {
    const parts = token.text.split('\n')
    parts.forEach((part, index) => {
      if (part) appendToken(lines[lines.length - 1], part, token.kind)
      if (index < parts.length - 1) lines.push([])
    })
  }
  return lines
}

// Purely visual lexer. It never evaluates code or emits HTML: React receives the
// original source as text tokens, preserving the existing XSS boundary.
export function highlightCode(source: string, language: string): CodeLine[] {
  const grammar = GRAMMARS[language]
  if (!grammar) {
    return source.split('\n').map((line) => (line ? [{ text: line, kind: 'plain' }] : []))
  }
  return toLines(tokenize(source, language, grammar))
}
