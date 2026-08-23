'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/i18n/useTranslation'
import { cx } from '@/ui/cx'
import { IconUser, IconChevronDown } from '@/ui/icons'
import { useAuth } from '../useAuth'
import styles from './UserMenu.module.css'

// Signed-in navbar entry. Same disclosure pattern as LanguageSwitcher (button +
// list, not an ARIA menu — no roving focus implemented, keep the contract honest).
// The account link ships in P3; the leaderboard joins the list in P4.
export function UserMenu() {
  const { t } = useTranslation()
  const { user, profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
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

  // Until the profile row exists (UsernameGate pending) fall back to the email's
  // local part — never render a blank trigger.
  const label = profile?.username ?? user?.email?.split('@')[0] ?? '…'

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={listId}
        aria-label={t('auth.menu.openAria', { username: label })}
        onClick={() => setOpen((o) => !o)}
      >
        <IconUser size={18} />
        <span className={styles.name}>{label}</span>
        <IconChevronDown size={14} className={cx(styles.caret, open && styles.caretOpen)} />
      </button>

      {open && (
        <ul id={listId} className={styles.list} aria-label={t('auth.menu.listAria')}>
          <li>
            <Link className={styles.item} href="/account" onClick={() => setOpen(false)}>
              {t('nav.account')}
            </Link>
          </li>
          <li>
            <button
              type="button"
              className={styles.item}
              onClick={() => {
                setOpen(false)
                void signOut()
              }}
            >
              {t('nav.signOut')}
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
