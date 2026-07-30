'use client'

import { m, useReducedMotion } from 'framer-motion'
import type { Level } from '@/lib/schema/level'
import type { ExecutionResult } from '@/lib/engine/sqlRunner'
import { cx } from '../lib/cx'
import { getJobNarrative } from '../lib/narrative'
import { useTranslation } from '@/app/i18n/useTranslation'
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
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const payloadEntries = Object.entries(winningInputs).filter(([, v]) => v.trim().length > 0)
  const narrative = getJobNarrative(level.id)
  const headline = narrative?.loot.headline ?? t('game.loot.secured')
  const starFlavor = narrative?.loot.stars[stars]

  return (
    <section className={cx('container', styles.wrap)}>
      <m.div
        className={cx('panel', styles.card)}
        initial={{ opacity: 0, scale: reduce ? 1 : 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className={styles.secured} data-phase-heading tabIndex={-1}>
          <IconLock size={22} />
          <span>{headline}</span>
        </h1>

        {narrative && <p className={cx('prose', styles.fixerLine)}>{narrative.loot.fixer}</p>}

        <div className={styles.block}>
          <Stamp>{t('game.loot.winningPayload')}</Stamp>
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
          <Stamp>{t('game.loot.extracted')}</Stamp>
          <ResultGrid result={result} winCondition={level.winCondition} />
        </div>

        <ScoreBreakdown
          failedRuns={failedRuns}
          openedTiers={openedTiers}
          elapsedSec={elapsedSec}
          score={score}
          stars={stars}
        />

        {starFlavor && (
          <p className={styles.starFlavor}>
            <span className={styles.fixerTag}>{t('game.debrief.fixerTag')}</span>
            {starFlavor}
          </p>
        )}

        <div className={styles.actions}>
          <Button variant="primary" onClick={onDebrief} iconRight={<IconArrowRight size={18} />}>
            {t('game.loot.seeSlipped')}
          </Button>
        </div>
      </m.div>
    </section>
  )
}
