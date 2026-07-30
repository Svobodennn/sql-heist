'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import type { CodeSnippet } from '@/lib/schema/level'
import { nextTabIndex, type LanguageGroup } from '../lib/secureCode'
import { cx } from '../lib/cx'
import { IconLock, IconLockBroken } from './icons'
import { LangIcon } from './langIcons'
import styles from './CodeCompare.module.css'

// Debrief beat ③ (docs/04-frontend-ux.md §7.2). Vulnerable ↔ secure side by side
// (stacked on mobile — NOT tabs between vuln/secure, because the CONTRAST lesson
// needs both visible at once). Only the SECURE side is a selector, and it is now
// TWO-LEVEL, derived entirely from the data:
//   Level 1 — LANGUAGE: icon-led categories (JavaScript / Python / PHP / …) in a
//             single row that scrolls horizontally on overflow (never wraps down),
//             with momentum + a right/left fade affordance.
//   Level 2 — FRAMEWORK: a segmented chip row shown ONLY when the chosen language
//             ships more than one driver (PHP → PDO / Laravel, …).
// Both levels are ARIA tablists with roving tabindex + arrow-key navigation and
// share the code tabpanel below. Each panel is labeled by icon + word + color,
// never color alone (§11). Code is read-only, monospace, plain TEXT (React-escaped,
// K7/XSS). A single legacy snippet renders as a plain panel (no tabs).

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
  secureGroups,
}: {
  vulnerable: CodeSnippet
  secureGroups: LanguageGroup[]
}) {
  const baseId = useId()
  const [lang, setLang] = useState(0) // first language default-selected
  const [fw, setFw] = useState(0) // its first framework default-selected

  const langRefs = useRef<(HTMLButtonElement | null)[]>([])
  const fwRefs = useRef<(HTMLButtonElement | null)[]>([])
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: false, end: false })

  const group = secureGroups[lang] ?? secureGroups[0]
  const options = group?.options ?? []
  const activeSnippet = (options[fw] ?? options[0])?.snippet

  const multiLang = secureGroups.length > 1
  const multiFw = options.length > 1

  // Reveal the right/left scroll affordance only while there is more row to see.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const update = () => {
      const start = el.scrollLeft > 1
      const end = Math.ceil(el.scrollLeft + el.clientWidth) < el.scrollWidth - 1
      setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
    ro?.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro?.disconnect()
    }
  }, [secureGroups.length])

  const selectLang = (i: number) => {
    setLang(i)
    setFw(0) // new language -> reset to its first framework
  }

  // Roving tabindex: focus follows selection. preventScroll + an explicit,
  // centered scrollIntoView keeps the active language chip visible without the
  // page jumping; the scroller's `scroll-behavior` (smooth, auto under
  // prefers-reduced-motion) governs the animation.
  const onLangKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!NAV_KEYS.includes(e.key)) return
    e.preventDefault()
    const next = nextTabIndex(lang, e.key, secureGroups.length)
    selectLang(next)
    const btn = langRefs.current[next]
    btn?.focus({ preventScroll: true })
    btn?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }

  const onFwKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!NAV_KEYS.includes(e.key)) return
    e.preventDefault()
    const next = nextTabIndex(fw, e.key, options.length)
    setFw(next)
    fwRefs.current[next]?.focus({ preventScroll: true })
  }

  const langId = (i: number) => `${baseId}-lang-${i}`
  const fwId = (i: number) => `${baseId}-fw-${i}`
  const panelId = `${baseId}-code`
  // The code panel is labeled by the deepest active selector (framework if shown,
  // else language); a lone legacy snippet has no selector, so it is a plain block.
  const activeLeafId = multiFw ? fwId(fw) : multiLang ? langId(lang) : undefined

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
          {activeSnippet && <span className={styles.lang}>{activeSnippet.language}</span>}
        </p>

        {(multiLang || multiFw) && (
          <div className={styles.selector}>
            {multiLang && (
              <div className={styles.langBar}>
                <div
                  ref={scrollerRef}
                  role="tablist"
                  aria-label="Secure fix — language"
                  aria-orientation="horizontal"
                  className={styles.langScroller}
                  onKeyDown={onLangKeyDown}
                >
                  {secureGroups.map((g, i) => (
                    <button
                      key={g.language}
                      ref={(el) => {
                        langRefs.current[i] = el
                      }}
                      type="button"
                      role="tab"
                      id={langId(i)}
                      aria-selected={i === lang}
                      aria-controls={panelId}
                      tabIndex={i === lang ? 0 : -1}
                      className={cx(styles.langTab, i === lang && styles.langTabActive)}
                      onClick={() => selectLang(i)}
                    >
                      <LangIcon code={g.language} size={20} className={styles.langGlyph} />
                      <span>{g.name}</span>
                    </button>
                  ))}
                </div>
                <span
                  aria-hidden="true"
                  className={cx(styles.fade, styles.fadeStart, edges.start && styles.fadeOn)}
                />
                <span
                  aria-hidden="true"
                  className={cx(styles.fade, styles.fadeEnd, edges.end && styles.fadeOn)}
                />
              </div>
            )}

            {multiFw && (
              <div
                role="tablist"
                aria-label={`Secure fix — ${group?.name ?? ''} framework`}
                aria-orientation="horizontal"
                className={styles.fwBar}
                onKeyDown={onFwKeyDown}
              >
                {options.map((opt, i) => (
                  <button
                    key={opt.label}
                    ref={(el) => {
                      fwRefs.current[i] = el
                    }}
                    type="button"
                    role="tab"
                    id={fwId(i)}
                    aria-selected={i === fw}
                    aria-controls={panelId}
                    tabIndex={i === fw ? 0 : -1}
                    className={cx(styles.fwChip, i === fw && styles.fwChipActive)}
                    onClick={() => setFw(i)}
                  >
                    {opt.shortLabel}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSnippet && (
          <div
            role={activeLeafId ? 'tabpanel' : undefined}
            id={panelId}
            aria-labelledby={activeLeafId}
            tabIndex={activeLeafId ? 0 : undefined}
          >
            <CodeBlock code={activeSnippet.code} />
          </div>
        )}

        <p className={styles.caption}>Input is bound as a parameter — it stays data.</p>
      </div>
    </div>
  )
}
