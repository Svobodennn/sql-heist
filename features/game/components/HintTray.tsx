'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Hint } from '@/lib/schema/level'
import { DEFAULT_SCORING, canOpenHint } from '@/lib/engine/scoring'
import { cx } from '../lib/cx'
import { HINT_TIER_LABELS } from '../lib/narrative'
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
          <IconBulb size={13} /> Call the Fixer
        </Stamp>
        <span className={styles.count}>
          {openedTiers}/{hints.length} unlocked
        </span>
      </div>

      {suggest && openedTiers === 0 && (
        <p className={styles.suggest} aria-live="polite">
          Stuck? The Fixer&apos;s on the line.
        </p>
      )}

      <ol className={styles.slots}>
        {hints.map((hint, i) => {
          const tier = i + 1
          const tierLabel = HINT_TIER_LABELS[i] ?? `Tier ${tier}`
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
                <p className={cx(styles.hintText, tier === 3 && 'mono')}>{hint.text}</p>
              ) : isNext ? (
                <Button variant="ghost" onClick={() => openModal(tier)}>
                  Call the Fixer
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
              Costs you {cost(pendingTier)}. Still want it?
            </h2>
            <p className={styles.modalBody}>
              <strong>{HINT_TIER_LABELS[pendingTier - 1] ?? `Tier ${pendingTier}`}</strong> comes
              straight off your final score for this job — no refunds this run.
            </p>
            <div className={styles.modalActions}>
              <Button variant="ghost" onClick={closeModal}>
                Not yet
              </Button>
              <Button autoFocus variant="primary" onClick={confirm}>
                Make the call (−{cost(pendingTier)})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
