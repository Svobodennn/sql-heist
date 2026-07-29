'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Hint } from '@/lib/schema/level'
import { DEFAULT_SCORING } from '@/lib/engine/scoring'
import { cx } from '../lib/cx'
import { Button } from './Button'
import { Stamp } from './Stamp'
import { IconBulb } from './icons'
import styles from './HintTray.module.css'

// Handler intel (docs/04-frontend-ux.md §5.5). 3 slots, unlocked strictly in
// order, each behind a cost-confirm modal. The soft trigger (after N fails)
// gently SUGGESTS tier 1 but never auto-opens — the player keeps agency.
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
  const [pendingTier, setPendingTier] = useState<number | null>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  const cost = (tier: number) => hints[tier - 1]?.cost ?? DEFAULT_SCORING.hintCosts[tier - 1] ?? 0

  const openModal = (tier: number) => {
    restoreRef.current = document.activeElement as HTMLElement
    setPendingTier(tier)
  }
  const closeModal = useCallback(() => {
    setPendingTier(null)
    restoreRef.current?.focus()
  }, [])

  const confirm = () => {
    if (pendingTier != null) onOpen(pendingTier)
    closeModal()
  }

  useEffect(() => {
    if (pendingTier == null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pendingTier, closeModal])

  return (
    <div className={cx('panel', styles.tray)}>
      <div className={styles.head}>
        <Stamp>
          <IconBulb size={13} /> Handler intel
        </Stamp>
        <span className={styles.count}>
          {openedTiers}/{hints.length} unlocked
        </span>
      </div>

      {suggest && openedTiers === 0 && (
        <p className={styles.suggest} aria-live="polite">
          Stuck? The handler has intel — it&apos;ll cost you, but it&apos;s there.
        </p>
      )}

      <ol className={styles.slots}>
        {hints.map((hint, i) => {
          const tier = i + 1
          const isOpen = tier <= openedTiers
          const isNext = tier === openedTiers + 1
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
                <span className={styles.tier}>Tier {tier}</span>
                <span className={styles.cost}>−{cost(tier)}</span>
              </div>
              {isOpen ? (
                <p className={cx(styles.hintText, tier === 3 && 'mono')}>{hint.text}</p>
              ) : isNext ? (
                <Button variant="ghost" onClick={() => openModal(tier)}>
                  Unlock intel
                </Button>
              ) : (
                <p className={styles.lockedText}>Unlock the previous tier first.</p>
              )}
            </li>
          )
        })}
      </ol>

      {pendingTier != null && (
        <div className={styles.overlay} onClick={closeModal}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="hint-modal-title"
            className={cx('panel', styles.modal)}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="hint-modal-title" className={styles.modalTitle}>
              Unlock Tier {pendingTier} intel?
            </h2>
            <p className={styles.modalBody}>
              This costs <strong>{cost(pendingTier)}</strong> points from your final score. It
              cannot be undone for this run.
            </p>
            <div className={styles.modalActions}>
              <Button variant="ghost" onClick={closeModal}>
                Cancel
              </Button>
              <Button autoFocus variant="primary" onClick={confirm}>
                Unlock (−{cost(pendingTier)})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
