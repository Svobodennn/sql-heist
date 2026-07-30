'use client'

import type { Phase } from '../../lib/phaseMachine'
import { cx } from '@/ui/cx'
import { useTranslation } from '@/i18n/useTranslation'
import { IconCheck } from '../icons'
import styles from '../TopBar/TopBar.module.css'

const STEPS: Phase[] = ['brief', 'recon', 'exploit', 'loot', 'debrief']

// 5-step progress (docs/04-frontend-ux.md §2). State is carried by dot + check
// icon + label + position, never color alone (§11): completed = jade + check,
// active = brass ring + aria-current, locked = muted.
export function PhaseStepper({ phase }: { phase: Phase }) {
  const { t } = useTranslation()
  const currentIndex = STEPS.indexOf(phase)

  return (
    <ol className={styles.stepper} aria-label={t('game.phase.progressAria')}>
      {STEPS.map((step, i) => {
        const state = i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'locked'
        return (
          <li
            key={step}
            className={cx(styles.step, styles[`step--${state}`])}
            aria-current={state === 'active' ? 'step' : undefined}
          >
            <span className={styles.dot} aria-hidden="true">
              {state === 'done' ? <IconCheck size={12} /> : i + 1}
            </span>
            <span className={styles.stepLabel}>{t(`game.phase.${step}`)}</span>
          </li>
        )
      })}
    </ol>
  )
}
