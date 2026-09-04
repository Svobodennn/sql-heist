'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { nextTabIndex, optionCount, snippetAt, type LanguageGroup } from '../../lib/secureCode'
import { cx } from '@/ui/cx'
import { useTranslation } from '@/i18n/useTranslation'
import { highlightCode, type CodeTokenKind } from '../../lib/codeHighlight'
import { IconLock, IconLockBroken } from '../icons'
import { LangIcon } from '../langIcons'
import styles from './CodeCompare.module.css'

// Debrief beat ③ (docs/04-frontend-ux.md §7.2). Vulnerable ↔ secure side by side
// (stacked on mobile — NOT tabs between vuln/secure, because the CONTRAST lesson
// needs both visible at once). A SINGLE two-level selector now drives BOTH panels:
//   Level 1 — LANGUAGE: icon-led categories (JavaScript / Python / PHP / …) in a
//             single row that scrolls horizontally on overflow (never wraps down),
//             with momentum + a right/left fade affordance.
//   Level 2 — FRAMEWORK: a segmented chip row shown ONLY when the chosen language
//             ships more than one driver (PHP → PDO / Laravel, …).
// Picking "PHP → Laravel" shows Laravel's vulnerable code ↔ Laravel's secure code.
// The selector follows whichever side ships the richer stack list so no stack is
// unreachable (identical in the normal 1:1 pairing). Each panel resolves its OWN
// snippet at the selected (lang, fw) and falls back to its single snippet when it
// lacks a variant for that stack — a legacy single-snippet side, or a vuln/secure
// count mismatch. Both levels are ARIA tablists with roving tabindex + arrow-key
// navigation and jointly control the two code panels (aria-controls lists both).
// Each panel is labeled by icon + word + color, never color alone (§11). Code is
// read-only, monospace, syntax-colored React TEXT (never HTML, K7/XSS). A pair of
// lone legacy snippets renders as two plain panels (no tabs).

const NAV_KEYS = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End']

const TOKEN_CLASSES: Readonly<Record<CodeTokenKind, string>> = {
  keyword: styles.tokenKeyword,
  string: styles.tokenString,
  number: styles.tokenNumber,
  comment: styles.tokenComment,
  operator: styles.tokenOperator,
  type: styles.tokenType,
  function: styles.tokenFunction,
  variable: styles.tokenVariable,
  plain: styles.tokenPlain,
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const lines = highlightCode(code, language)
  return (
    <pre className={cx('mono', styles.code)}>
      <code data-code-language={language}>
        {lines.map((line, i) => (
          <span key={i} className={styles.line}>
            <span className={styles.ln} aria-hidden="true">
              {i + 1}
            </span>
            <span className={styles.src}>
              {line.length
                ? line.map((token, tokenIndex) => (
                    <span
                      key={`${i}-${tokenIndex}`}
                      className={TOKEN_CLASSES[token.kind]}
                      data-code-token={token.kind}
                    >
                      {token.text}
                    </span>
                  ))
                : ' '}
            </span>
          </span>
        ))}
      </code>
    </pre>
  )
}

export function CodeCompare({
  vulnerableGroups,
  secureGroups,
}: {
  vulnerableGroups: LanguageGroup[]
  secureGroups: LanguageGroup[]
}) {
  const { t } = useTranslation()
  const baseId = useId()
  const [lang, setLang] = useState(0) // first language default-selected
  const [fw, setFw] = useState(0) // its first framework default-selected

  const langRefs = useRef<(HTMLButtonElement | null)[]>([])
  const fwRefs = useRef<(HTMLButtonElement | null)[]>([])
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: false, end: false })

  // One selector drives both panels; it follows whichever side is richer so every
  // stack stays reachable (in the normal 1:1 pairing the two are identical, so a
  // tie resolves to the secure side — the historical selector source).
  const selectorGroups =
    optionCount(vulnerableGroups) > optionCount(secureGroups) ? vulnerableGroups : secureGroups

  const group = selectorGroups[lang] ?? selectorGroups[0]
  const options = group?.options ?? []

  const multiLang = selectorGroups.length > 1
  const multiFw = options.length > 1

  const vulnSnippet = snippetAt(vulnerableGroups, lang, fw)
  const secureSnippet = snippetAt(secureGroups, lang, fw)

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
  }, [selectorGroups.length])

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
    const next = nextTabIndex(lang, e.key, selectorGroups.length)
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
  const vulnPanelId = `${baseId}-vuln`
  const securePanelId = `${baseId}-secure`
  // Tabs are labeled by the deepest active selector (framework if shown, else
  // language); a pair of lone legacy snippets has no selector, so plain panels.
  const activeLeafId = multiFw ? fwId(fw) : multiLang ? langId(lang) : undefined
  // One tablist controls BOTH code panels — aria-controls accepts multiple ids.
  const panelIds = `${vulnPanelId} ${securePanelId}`

  return (
    <div className={styles.compare}>
      {(multiLang || multiFw) && (
        <div className={styles.selector}>
          {multiLang && (
            <div className={styles.langBar}>
              <div
                ref={scrollerRef}
                role="tablist"
                aria-label={t('game.compare.langAria')}
                aria-orientation="horizontal"
                className={styles.langScroller}
                onKeyDown={onLangKeyDown}
              >
                {selectorGroups.map((g, i) => (
                  <button
                    key={g.language}
                    ref={(el) => {
                      langRefs.current[i] = el
                    }}
                    type="button"
                    role="tab"
                    id={langId(i)}
                    aria-selected={i === lang}
                    aria-controls={panelIds}
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
              aria-label={t('game.compare.fwAria', { name: group?.name ?? '' })}
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
                  aria-controls={panelIds}
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

      <div className={styles.grid}>
        <div className={cx(styles.panel, styles.vuln)}>
          <p className={styles.head}>
            <IconLockBroken size={16} />
            <span>{t('game.compare.vulnerable')}</span>
            {vulnSnippet && <span className={styles.lang}>{vulnSnippet.language}</span>}
          </p>
          {vulnSnippet && (
            <div
              role={activeLeafId ? 'tabpanel' : undefined}
              id={vulnPanelId}
              aria-labelledby={activeLeafId}
              tabIndex={activeLeafId ? 0 : undefined}
            >
              <CodeBlock code={vulnSnippet.code} language={vulnSnippet.language} />
            </div>
          )}
          <p className={styles.caption}>{t('game.compare.vulnCaption')}</p>
        </div>

        <div className={cx(styles.panel, styles.secure)}>
          <p className={styles.head}>
            <IconLock size={16} />
            <span>{t('game.compare.secure')}</span>
            {secureSnippet && <span className={styles.lang}>{secureSnippet.language}</span>}
          </p>
          {secureSnippet && (
            <div
              role={activeLeafId ? 'tabpanel' : undefined}
              id={securePanelId}
              aria-labelledby={activeLeafId}
              tabIndex={activeLeafId ? 0 : undefined}
            >
              <CodeBlock code={secureSnippet.code} language={secureSnippet.language} />
            </div>
          )}
          <p className={styles.caption}>{t('game.compare.secureCaption')}</p>
        </div>
      </div>
    </div>
  )
}
