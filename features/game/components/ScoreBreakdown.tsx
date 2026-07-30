'use client'

import { DEFAULT_SCORING, hintPenalty } from '@/lib/engine/scoring'
import { cx } from '../lib/cx'
import { useTranslation } from '@/i18n/useTranslation'
import { IconStar } from './icons'
import styles from './ScoreBreakdown.module.css'

// Transparent score breakdown (docs/04-frontend-ux.md §6). Recomputes the pieces
// from the same params the frozen engine's computeJobScore uses, so the displayed
// math reconciles with the authoritative `score` passed in.
interface ScoreBreakdownProps {
  failedRuns: number
  openedTiers: number
  elapsedSec: number
  score: number
  stars: 1 | 2 | 3
}

export function ScoreBreakdown({
  failedRuns,
  openedTiers,
  elapsedSec,
  score,
  stars,
}: ScoreBreakdownProps) {
  const { t } = useTranslation()
  const p = DEFAULT_SCORING
  const overAttempts = Math.max(0, failedRuns - p.freeAttempts)
  const attemptCost = p.attemptPenalty * overAttempts
  const hintCost = hintPenalty(openedTiers, p.hintCosts)
  const timeBonus = Math.min(p.timeBonusCap, Math.max(0, p.timeBonusRate * (p.parTimeSec - elapsedSec)))
  const starLabel = t(`game.stars.tier.${stars}`)

  const rows: { label: string; value: number; tone: 'add' | 'sub' }[] = [
    { label: t('game.score.base'), value: p.base, tone: 'add' },
  ]
  if (attemptCost > 0) {
    rows.push({
      label: t('game.score.attempts', { over: overAttempts, free: p.freeAttempts }),
      value: -attemptCost,
      tone: 'sub',
    })
  }
  if (hintCost > 0) rows.push({ label: t('game.score.hints', { n: openedTiers }), value: -hintCost, tone: 'sub' })
  rows.push({ label: t('game.score.timeBonus'), value: timeBonus, tone: 'add' })

  return (
    <div className={styles.wrap}>
      <ol className={styles.rows}>
        {rows.map((row) => (
          <li key={row.label} className={styles.row}>
            <span className={styles.label}>{row.label}</span>
            <span className={cx('mono', styles.value, row.tone === 'sub' ? styles.sub : styles.add)}>
              {row.value >= 0 ? '+' : ''}
              {row.value}
            </span>
          </li>
        ))}
        <li className={cx(styles.row, styles.total)}>
          <span className={styles.label}>{t('game.score.score')}</span>
          <span className={cx('mono', styles.value)}>{score}</span>
        </li>
      </ol>

      <div className={styles.rating}>
        <div
          className={styles.stars}
          aria-label={t('game.stars.aria', { stars, label: starLabel })}
        >
          {[1, 2, 3].map((n) => (
            <IconStar
              key={n}
              size={22}
              filled={n <= stars}
              className={n <= stars ? styles.starOn : styles.starOff}
            />
          ))}
        </div>
        <span className={styles.tierLabel}>{starLabel}</span>
      </div>
    </div>
  )
}
