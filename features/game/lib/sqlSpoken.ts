import type { ComposedSegment } from '@/lib/engine/queryComposer'

// A11y spoken reconstruction of the composed SQL for <SqlPreview> (docs/04 §5.2,
// §11). Distinct concern from the purely-visual tokenizer (sqlHighlight): this
// names each injected span so a screen-reader user gets the same "my input became
// code" insight the color/bracket layer gives sighted users. Whitespace is
// collapsed because a screen reader ignores the visual layout anyway.
export function toSpokenSql(segments: ComposedSegment[]): string {
  const body = segments
    .map((seg) => {
      if (seg.kind === 'static') return seg.text
      if (seg.value.length === 0) return ` empty injection point for ${seg.field} `
      return ` injected: ${seg.value} , end injected `
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
  return `SQL sent to the database: ${body}`
}
