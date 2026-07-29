'use client'

import type { ComposedSegment } from '@/lib/engine/queryComposer'
import { classifyChars, toRuns } from '../lib/sqlHighlight'
import { cx } from '../lib/cx'
import styles from './SqlPreview.module.css'

// THE WIRE (docs/04-frontend-ux.md §5.2) — the transparent, live "composed SQL".
//
// The static-vs-injected split is driven ENTIRELY by the engine's
// ComposedSegment[] (composer-correct, PLAN §2.2) — NOT by a regex over the
// output. On top of that engine-truth we overlay a purely cosmetic token layer
// (keyword/string/number + the commented-out tail) from sqlHighlight.
//
// XSS (docs/01 §9-R1, K7): every character — including raw player input — is
// rendered as React text nodes, so React escapes it. dangerouslySetInnerHTML is
// forbidden (also lint-enforced); a payload like `<img onerror=…>` renders as
// literal text, never as markup.

interface SqlPreviewProps {
  segments: ComposedSegment[]
  className?: string
}

export function SqlPreview({ segments, className }: SqlPreviewProps) {
  const sql = segments.map((s) => (s.kind === 'static' ? s.text : s.value)).join('')
  const charStyles = classifyChars(sql)

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
        <span
          key={idx}
          className={styles.injectedEmpty}
          data-field={seg.field}
          aria-hidden="true"
        />
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

  return (
    <pre
      className={cx('mono', styles.wire, className)}
      aria-live="polite"
      aria-label="Composed SQL sent to the database"
    >
      <code>{nodes}</code>
    </pre>
  )
}
