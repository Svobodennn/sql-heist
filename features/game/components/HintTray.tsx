'use client'

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { Hint } from '@/lib/schema/level'
import { DEFAULT_SCORING, canOpenHint } from '@/lib/engine/scoring'
import { cx } from '../lib/cx'
import { useTranslation } from '@/i18n/useTranslation'
import { Button } from './Button'
import { Stamp } from './Stamp'
import { IconBulb } from './icons'
import styles from './HintTray.module.css'

// Call the Fixer (docs/04-frontend-ux.md §5.5, docs/06-narrative.md §7). 3 tiers
// — A word / The method / The play — unlocked strictly in order via the frozen
// engine's canOpenHint, each behind a cost-confirm modal. The soft trigger (after
// N fails) gently SUGGESTS tier 1 but never auto-opens — the player keeps agency.
export function HintTray({
  hints,
  openedTiers,
  onOpen,
  suggest,
}: {
  hints: Hint[]
  openedTiers: number
  onOpen: (tier: number) => void
  suggest: boolean
}) {
  const { t } = useTranslation()
  // Tier vocabulary (A word / The method / The play); a rare 4th+ hint falls back
  // to a generic "Tier N".
  const tierLabelFor = (index: number) =>
    index < 3 ? t(`game.hint.tier.${index}`) : t('game.hint.tierFallback', { n: index + 1 })
  const [pendingTier, setPendingTier] = useState<number | null>(null)
  const restoreRef = useRef<HTMLElement | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const hintTextRefs = useRef<(HTMLParagraphElement | null)[]>([])
  // On CONFIRM the tier reveals and its "Call the Fixer" trigger unmounts, so
  // restoring focus to that trigger would drop focus to <body> (WCAG 2.4.3). We
  // record the confirmed tier here and, once the reveal commits, move focus to
  // that tier's now-visible hint text instead (see the openedTiers effect below).
  const revealFocusTier = useRef<number | null>(null)

  const cost = (tier: number) => hints[tier - 1]?.cost ?? DEFAULT_SCORING.hintCosts[tier - 1] ?? 0

  const openModal = (tier: number) => {
    restoreRef.current = document.activeElement as HTMLElement
    setPendingTier(tier)
  }
  // Cancel / Esc / overlay path: the trigger is still mounted, so restoring focus
  // to it is correct. (CONFIRM deliberately does NOT go through here.)
  const closeModal = useCallback(() => {
    setPendingTier(null)
    restoreRef.current?.focus()
  }, [])

  const confirm = () => {
    if (pendingTier == null) return
    revealFocusTier.current = pendingTier
    onOpen(pendingTier)
    // Close WITHOUT closeModal(): closeModal restores focus to the trigger, which
    // is exactly the element about to unmount. The reveal effect lands focus on
    // the newly revealed hint instead.
    setPendingTier(null)
  }

  // Land focus on the just-revealed hint after a CONFIRM. Keyed on openedTiers so
  // it runs only once the parent re-renders the tier as open; the ref guard means
  // it never fires on mount or on a cancel/Esc/overlay close.
  useEffect(() => {
    const tier = revealFocusTier.current
    if (tier == null) return
    revealFocusTier.current = null
    hintTextRefs.current[tier - 1]?.focus()
  }, [openedTiers])

  useEffect(() => {
    if (pendingTier == null) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pendingTier, closeModal])

  // Focus trap: keep Tab / Shift+Tab cycling inside the modal (aria-modal alone
  // does not stop focus escaping to the page behind it — WCAG 2.4.3 / 2.1.2).
  const trapTab = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (!focusables || focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    const active = document.activeElement
    if (e.shiftKey && active === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className={cx('panel', styles.tray)}>
      <div className={styles.head}>
        <Stamp>
          <IconBulb size={13} /> {t('game.hint.call')}
        </Stamp>
        <span className={styles.count}>
          {t('game.hint.unlocked', { opened: openedTiers, total: hints.length })}
        </span>
      </div>

      {suggest && openedTiers === 0 && (
        <p className={styles.suggest} aria-live="polite">
          {t('game.hint.suggest')}
        </p>
      )}

      <ol className={styles.slots}>
        {hints.map((hint, i) => {
          const tier = i + 1
          const tierLabel = tierLabelFor(i)
          const isOpen = tier <= openedTiers
          const isNext = canOpenHint(openedTiers, tier, hints.length)
          return (
            <li
              key={hint.id}
              className={cx(
                styles.slot,
                isOpen && styles.slotOpen,
                !isOpen && !isNext && styles.slotLocked,
              )}
            >
              <div className={styles.slotHead}>
                <span className={styles.tier}>{tierLabel}</span>
                <span className={styles.cost}>−{cost(tier)}</span>
              </div>
              {isOpen ? (
                <p
                  ref={(el) => {
                    hintTextRefs.current[i] = el
                  }}
                  tabIndex={-1}
                  className={cx(styles.hintText, tier === 3 && 'mono')}
                >
                  {hint.text}
                </p>
              ) : isNext ? (
                <Button variant="ghost" onClick={() => openModal(tier)}>
                  {t('game.hint.call')}
                </Button>
              ) : (
                <p className={styles.lockedText}>{t('game.hint.locked')}</p>
              )}
            </li>
          )
        })}
      </ol>

      {pendingTier != null && (
        <div className={styles.overlay} onClick={closeModal}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="hint-modal-title"
            className={cx('panel', styles.modal)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={trapTab}
          >
            <h2 id="hint-modal-title" className={styles.modalTitle}>
              {t('game.hint.confirmTitle', { cost: cost(pendingTier) })}
            </h2>
            <p className={styles.modalBody}>
              <strong>{tierLabelFor(pendingTier - 1)}</strong> {t('game.hint.confirmBody')}
            </p>
            <div className={styles.modalActions}>
              <Button variant="ghost" onClick={closeModal}>
                {t('game.hint.notYet')}
              </Button>
              <Button autoFocus variant="primary" onClick={confirm}>
                {t('game.hint.makeCall')} (−{cost(pendingTier)})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
