'use client'

import { useId, useRef, useState, type KeyboardEvent } from 'react'
import type { CodeSnippet } from '@/lib/schema/level'
import { nextTabIndex, type SecureSnippet } from '../lib/secureCode'
import { cx } from '../lib/cx'
import { IconLock, IconLockBroken } from './icons'
import styles from './CodeCompare.module.css'

// Debrief beat ③ (docs/04-frontend-ux.md §7.2). Vulnerable ↔ secure side by side
// (stacked on mobile — NOT tabs between vuln/secure, because the CONTRAST lesson
// needs both visible at once). The SECURE side is per-stack: `secureTabs` may
// hold one entry (legacy single secureCode) or many (per-language variants). One
// entry renders as a plain panel; many render a keyboard-navigable tablist with
// the first tab selected by default, swapping only the secure snippet.
// Each panel is labeled by icon + word + color, never color alone (§11). Code is
// read-only, monospace, and rendered as plain text (React-escaped, K7/XSS).

const NAV_KEYS = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End']

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
  secureTabs,
}: {
  vulnerable: CodeSnippet
  secureTabs: SecureSnippet[]
}) {
  const [selected, setSelected] = useState(0) // first tab default-expanded
  const baseId = useId()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const active = secureTabs[selected] ?? secureTabs[0]
  const multi = secureTabs.length > 1

  const onTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!NAV_KEYS.includes(e.key)) return
    e.preventDefault()
    const next = nextTabIndex(selected, e.key, secureTabs.length)
    setSelected(next)
    tabRefs.current[next]?.focus() // roving tabindex: focus follows selection
  }

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
          {active && <span className={styles.lang}>{active.snippet.language}</span>}
        </p>

        {multi && (
          <div
            role="tablist"
            aria-label="Secure implementation by stack"
            aria-orientation="horizontal"
            className={styles.tabs}
            onKeyDown={onTabKeyDown}
          >
            {secureTabs.map((tab, i) => (
              <button
                key={`${tab.stack}-${i}`}
                ref={(el) => {
                  tabRefs.current[i] = el
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${i}`}
                aria-selected={i === selected}
                aria-controls={`${baseId}-panel-${i}`}
                tabIndex={i === selected ? 0 : -1}
                className={cx(styles.tab, i === selected && styles.tabActive)}
                onClick={() => setSelected(i)}
              >
                {tab.stack}
              </button>
            ))}
          </div>
        )}

        {active &&
          (multi ? (
            <div
              role="tabpanel"
              id={`${baseId}-panel-${selected}`}
              aria-labelledby={`${baseId}-tab-${selected}`}
              tabIndex={0}
            >
              <CodeBlock code={active.snippet.code} />
            </div>
          ) : (
            <CodeBlock code={active.snippet.code} />
          ))}

        <p className={styles.caption}>Input is bound as a parameter — it stays data.</p>
      </div>
    </div>
  )
}
