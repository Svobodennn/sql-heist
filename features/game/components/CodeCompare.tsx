'use client'

import type { CodeSnippet } from '@/lib/schema/level'
import { cx } from '../lib/cx'
import { IconLock, IconLockBroken } from './icons'
import styles from './CodeCompare.module.css'

// Debrief beat ③ (docs/04-frontend-ux.md §7.2). Vulnerable ↔ secure side by side
// (stacked on mobile — NOT tabs, because the contrast lesson needs both visible
// at once). Each panel is labeled by icon + word + color, never color alone (§11).
// Code is read-only, monospace, and rendered as plain text (React-escaped).

function CodeBlock({ code }: { code: string }) {
  const lines = code.split('\n')
  return (
    <pre className={cx('mono', styles.code)}>
      <code>
        {lines.map((line, i) => (
          <span key={i} className={styles.line}>
            <span className={styles.ln} aria-hidden="true">
              {i + 1}
            </span>
            <span className={styles.src}>{line.length ? line : ' '}</span>
          </span>
        ))}
      </code>
    </pre>
  )
}

export function CodeCompare({
  vulnerable,
  secure,
}: {
  vulnerable: CodeSnippet
  secure: CodeSnippet
}) {
  return (
    <div className={styles.grid}>
      <div className={cx(styles.panel, styles.vuln)}>
        <p className={styles.head}>
          <IconLockBroken size={16} />
          <span>Vulnerable</span>
          <span className={styles.lang}>{vulnerable.language}</span>
        </p>
        <CodeBlock code={vulnerable.code} />
        <p className={styles.caption}>Input is concatenated into the query — data becomes code.</p>
      </div>

      <div className={cx(styles.panel, styles.secure)}>
        <p className={styles.head}>
          <IconLock size={16} />
          <span>Secure</span>
          <span className={styles.lang}>{secure.language}</span>
        </p>
        <CodeBlock code={secure.code} />
        <p className={styles.caption}>Input is bound as a parameter — it stays data.</p>
      </div>
    </div>
  )
}
