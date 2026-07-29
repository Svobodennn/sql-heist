'use client'

import { DEFAULT_SCORING, hintPenalty } from '@/lib/engine/scoring'
import { cx } from '../lib/cx'
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
  const p = DEFAULT_SCORING
  const overAttempts = Math.max(0, failedRuns - p.freeAttempts)
  const attemptCost = p.attemptPenalty * overAttempts
  const hintCost = hintPenalty(openedTiers, p.hintCosts)
  const timeBonus = Math.min(p.timeBonusCap, Math.max(0, p.timeBonusRate * (p.parTimeSec - elapsedSec)))

  const rows: { label: string; value: number; tone: 'add' | 'sub' }[] = [
    { label: 'Base', value: p.base, tone: 'add' },
  ]
  if (attemptCost > 0) {
    rows.push({ label: `Attempts (${overAttempts} over ${p.freeAttempts} free)`, value: -attemptCost, tone: 'sub' })
  }
  if (hintCost > 0) rows.push({ label: `Hints (${openedTiers})`, value: -hintCost, tone: 'sub' })
  rows.push({ label: 'Time bonus', value: timeBonus, tone: 'add' })

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
          <span className={styles.label}>Score</span>
          <span className={cx('mono', styles.value)}>{score}</span>
        </li>
      </ol>

      <div className={styles.stars} aria-label={`${stars} of 3 stars`}>
        {[1, 2, 3].map((n) => (
          <IconStar key={n} size={22} filled={n <= stars} className={n <= stars ? styles.starOn : styles.starOff} />
        ))}
      </div>
    </div>
  )
}
