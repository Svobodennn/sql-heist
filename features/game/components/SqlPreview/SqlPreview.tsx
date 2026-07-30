'use client'

import { useMemo } from 'react'
import type { ComposedSegment } from '@/lib/engine/queryComposer'
import { classifyChars, toRuns } from '../../lib/sqlHighlight'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { cx } from '../../lib/cx'
import styles from './SqlPreview.module.css'

// THE WIRE (docs/04-frontend-ux.md §5.2) — the transparent, live "composed SQL".
//
// The static-vs-injected split is driven ENTIRELY by the engine's
// ComposedSegment[] (composer-correct, PLAN §2.2) — NOT by a regex over the
// output. On top of that engine-truth we overlay a purely cosmetic token layer
// (keyword/string/number + the commented-out tail) from sqlHighlight.
//
// A11y: the visual <pre> carries the lesson with COLOR + brackets ⟦ ⟧ + a dashed
// underline, which is invisible to a screen reader. So the visual layer is
// aria-hidden and a SINGLE polite live region speaks a debounced reconstruction
// that names each injected span ("injected … end injected"), giving blind users
// the same "my input became code" insight — announced once when typing settles,
// never per keystroke, and never nested inside another live region (§11).
//
// XSS (docs/01 §9-R1, K7): every character — including raw player input — is
// rendered as React text nodes, so React escapes it. dangerouslySetInnerHTML is
// forbidden (also lint-enforced); a payload like `<img onerror=…>` renders as
// literal text, never as markup.

interface SqlPreviewProps {
  segments: ComposedSegment[]
  className?: string
}

// Spoken reconstruction: static text verbatim, injected spans wrapped so the
// injection is unmistakable to assistive tech. Whitespace is collapsed because a
// screen reader ignores the visual layout anyway.
function toSpokenSql(segments: ComposedSegment[]): string {
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

export function SqlPreview({ segments, className }: SqlPreviewProps) {
  const sql = useMemo(
    () => segments.map((s) => (s.kind === 'static' ? s.text : s.value)).join(''),
    [segments],
  )
  const charStyles = useMemo(() => classifyChars(sql), [sql])

  let offset = 0
  const nodes = segments.map((seg, idx) => {
    const text = seg.kind === 'static' ? seg.text : seg.value
    const slice = charStyles.slice(offset, offset + text.length)
    offset += text.length

    const runs = toRuns(text, slice).map((run, i) => (
      <span key={i} className={styles[run.kind]}>
        {run.text}
      </span>
    ))

    if (seg.kind === 'static') {
      return <span key={idx}>{runs}</span>
    }

    // Injected segment: crimson band + break-out markers ⟦ ⟧ + dashed underline
    // (color is never the only signal — §11). Empty value = a blinking caret so
    // the player still sees WHERE their input lands.
    if (seg.value.length === 0) {
      return (
        <span key={idx} className={styles.injectedEmpty} data-field={seg.field} aria-hidden="true" />
      )
    }
    return (
      <span key={idx} className={styles.injected} data-field={seg.field}>
        <span className={styles.brk} aria-hidden="true">
          ⟦
        </span>
        {runs}
        <span className={styles.brk} aria-hidden="true">
          ⟧
        </span>
      </span>
    )
  })

  const spokenNow = useMemo(() => toSpokenSql(segments), [segments])
  const spoken = useDebouncedValue(spokenNow, 500)

  return (
    <>
      <pre className={cx('mono', styles.wire, className)} aria-hidden="true">
        <code>{nodes}</code>
      </pre>
      <p className="sr-only" aria-live="polite">
        {spoken}
      </p>
    </>
  )
}
