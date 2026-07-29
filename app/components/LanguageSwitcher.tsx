'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { cx } from './cx'
import { IconGlobe, IconChevronDown, IconCheck } from './icons'
import styles from './LanguageSwitcher.module.css'

// PLACEHOLDER switcher. Real i18n is WS4 — here EN is the only live locale;
// TR/PL are shown (so the surface is real) but disabled/no-op. This is a
// disclosure (button + list), deliberately NOT an ARIA menu, because we don't
// implement roving arrow-key navigation — a disclosure keeps the a11y contract
// honest.
const LOCALES = [
  { code: 'en', label: 'English', live: true },
  { code: 'tr', label: 'Türkçe', live: false },
  { code: 'pl', label: 'Polski', live: false },
] as const

export function LanguageSwitcher({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onClick)
    }
  }, [open])

  return (
    <div ref={wrapRef} className={cx(styles.wrap, className)}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={listId}
        aria-label="Language: English"
        onClick={() => setOpen((o) => !o)}
      >
        <IconGlobe size={18} />
        <span aria-hidden="true">EN</span>
        <IconChevronDown size={14} className={cx(styles.caret, open && styles.caretOpen)} />
      </button>

      {open && (
        <ul id={listId} className={styles.list} aria-label="Choose language">
          {LOCALES.map((loc) => (
            <li key={loc.code}>
              <button
                type="button"
                className={styles.item}
                disabled={!loc.live}
                aria-current={loc.live ? 'true' : undefined}
                onClick={() => setOpen(false)}
              >
                <span>{loc.label}</span>
                {loc.live ? (
                  <IconCheck size={16} className={styles.check} />
                ) : (
                  <span className={styles.soon}>Soon</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
