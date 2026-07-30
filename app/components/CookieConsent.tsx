'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from '@/app/i18n/useTranslation'
import { IconCheck } from './icons'
import styles from './CookieConsent.module.css'

// Persisted acknowledgement flag. Deliberately distinct from the locale/progress
// keys the app already uses (sql-heist:locale, sql-heist:progress:v1); versioned
// so a future copy change could re-prompt without stranding old acknowledgements.
const CONSENT_KEY = 'sql-heist:consent:v1'

// Bottom storage notice — honest to this app: it only writes game progress and the
// language choice to localStorage; no cookies, no tracking, no analytics. Rendered
// once from the root layout so it covers every route.
//
// Hydration safety: the static export ships NO banner (the first render returns
// null, matching the server HTML). Only AFTER mount do we read localStorage and, if
// the player hasn't acknowledged it, reveal the notice — so there is never a
// server/client markup mismatch and the default export stays byte-identical.
//
// Non-blocking: the fixed wrapper is pointer-events:none, so it can never intercept
// a click meant for the page beneath it; only the card itself is interactive.
export function CookieConsent() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (window.localStorage.getItem(CONSENT_KEY) !== '1') setOpen(true)
    } catch {
      // Private mode / storage disabled: skip the notice rather than risk a throw.
    }
  }, [])

  const dismiss = useCallback(() => {
    setOpen(false)
    try {
      window.localStorage.setItem(CONSENT_KEY, '1')
    } catch {
      // Can't persist (storage blocked) — still hide it for this session.
    }
  }, [])

  // Escape dismisses (mirrors the Navbar mobile-menu pattern) so keyboard users are
  // not forced to tab all the way to the button.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, dismiss])

  if (!open) return null

  return (
    <div className={styles.root}>
      <section className={styles.card} aria-label={t('consent.aria')} tabIndex={-1}>
        <div className={styles.copy}>
          <p className={styles.title}>{t('consent.title')}</p>
          <p className={styles.body}>{t('consent.body')}</p>
        </div>
        <button type="button" className={styles.accept} onClick={dismiss}>
          <IconCheck size={16} />
          <span>{t('consent.accept')}</span>
        </button>
      </section>
    </div>
  )
}
