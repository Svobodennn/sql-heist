'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { LOCALES, LOCALE_LABELS, LOCALE_SHORT } from '@/i18n/config'
import { switchLocaleHref } from '@/i18n/localeHref'
import { useTranslation } from '@/i18n/useTranslation'
import { cx } from '@/ui/cx'
import { IconGlobe, IconChevronDown, IconCheck } from '../icons'
import { navigateToLocaleDestination } from './localeNavigation'
import styles from './LanguageSwitcher.module.css'

// Live locale switcher wired to the client I18nProvider (WS4). Picking a language
// persists the choice and navigates to a root whose static HTML owns <html lang>. It is
// a disclosure (button + list), deliberately NOT an ARIA menu, because we don't
// implement roving arrow-key navigation — a disclosure keeps the a11y contract
// honest. Escape and outside-click close it.
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname() ?? '/'
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

  const choose = (next: (typeof LOCALES)[number]) => {
    setOpen(false)
    setLocale(next) // remember the choice: drives the game chrome + seeds the switcher

    // Preserve query/hash state while moving between static locale variants. The
    // helper leaves non-localized routes such as /auth/callback canonical.
    const destination = switchLocaleHref(
      pathname,
      window.location.search,
      window.location.hash,
      next,
    )
    navigateToLocaleDestination(destination, router.push)
  }

  return (
    <div ref={wrapRef} className={cx(styles.wrap, className)}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={listId}
        aria-label={t('lang.triggerAria', { language: LOCALE_LABELS[locale] })}
        onClick={() => setOpen((o) => !o)}
      >
        <IconGlobe size={18} />
        <span aria-hidden="true">{LOCALE_SHORT[locale]}</span>
        <IconChevronDown size={14} className={cx(styles.caret, open && styles.caretOpen)} />
      </button>

      {open && (
        <ul id={listId} className={styles.list} aria-label={t('lang.chooseAria')}>
          {LOCALES.map((code) => {
            const active = code === locale
            return (
              <li key={code}>
                <button
                  type="button"
                  className={styles.item}
                  aria-current={active ? 'true' : undefined}
                  onClick={() => choose(code)}
                >
                  <span>{LOCALE_LABELS[code]}</span>
                  {active && <IconCheck size={16} className={styles.check} />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
