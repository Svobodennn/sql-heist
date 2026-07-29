'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { Level } from '@/lib/schema/level'
import type { ExecutionResult } from '@/lib/engine/sqlRunner'
import { cx } from '../lib/cx'
import { Button } from './Button'
import { ResultGrid } from './ResultGrid'
import { ScoreBreakdown } from './ScoreBreakdown'
import { Stamp } from './Stamp'
import { IconArrowRight, IconLock } from './icons'
import styles from './LootBanner.module.css'

// Screen 4 — LOOT (docs/04-frontend-ux.md §6). Catharsis + transparent score +
// the mandatory bridge to Debrief (loot never closes without the lesson). Noir
// restraint: no confetti — a stamped "SECURED" and a jade glow.
interface LootBannerProps {
  level: Level
  winningInputs: Record<string, string>
  result: ExecutionResult | null
  failedRuns: number
  openedTiers: number
  elapsedSec: number
  score: number
  stars: 1 | 2 | 3
  onDebrief: () => void
}

export function LootBanner({
  level,
  winningInputs,
  result,
  failedRuns,
  openedTiers,
  elapsedSec,
  score,
  stars,
  onDebrief,
}: LootBannerProps) {
  const reduce = useReducedMotion()
  const payloadEntries = Object.entries(winningInputs).filter(([, v]) => v.trim().length > 0)

  return (
    <section className={cx('container', styles.wrap)}>
      <motion.div
        className={cx('panel', styles.card)}
        initial={{ opacity: 0, scale: reduce ? 1 : 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className={styles.secured}>
          <IconLock size={22} />
          <span>Loot Secured</span>
        </p>

        <div className={styles.block}>
          <Stamp>Winning payload</Stamp>
          <ul className={styles.payload}>
            {payloadEntries.map(([field, value]) => (
              <li key={field} className="mono">
                <span className={styles.field}>{field}</span>
                <span className={styles.payloadValue}>{value}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.block}>
          <Stamp>Extracted</Stamp>
          <ResultGrid result={result} winCondition={level.winCondition} />
        </div>

        <ScoreBreakdown
          failedRuns={failedRuns}
          openedTiers={openedTiers}
          elapsedSec={elapsedSec}
          score={score}
          stars={stars}
        />

        <div className={styles.actions}>
          <Button variant="primary" onClick={onDebrief} iconRight={<IconArrowRight size={18} />}>
            Debrief
          </Button>
        </div>
      </motion.div>
    </section>
  )
}
