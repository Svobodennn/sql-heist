'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Level } from '@/lib/schema/level'
import { compose } from '@/lib/engine/queryComposer'
import { cx } from '../../lib/cx'
import { DEBRIEF_INTRO, getJobNarrative } from '../../lib/narrative'
import {
  groupSecureSnippets,
  selectSecureSnippets,
  selectVulnerableSnippets,
} from '../../lib/secureCode'
import { useTranslation } from '@/i18n/useTranslation'
import { Button } from '../Button'
import { CodeCompare } from '../CodeCompare'
import { SqlPreview } from '../SqlPreview'
import { Stamp } from '../Stamp'
import { IconArrowRight, IconCheck } from '../icons'
import styles from './DebriefPanel.module.css'

// Screen 5 — DEBRIEF (docs/04-frontend-ux.md §7). The mandatory teaching payoff:
// attack -> why -> the fix (CodeCompare) -> takeaway, anchored to the player's OWN
// winning payload. Beats reveal sequentially on first completion; on replay they
// are all shown at once.
interface DebriefPanelProps {
  level: Level
  winningInputs: Record<string, string>
  isReplay: boolean
  hasNextJob: boolean
  onNext: () => void
  onReplay: () => void
}

// move -> why -> fix -> takeaway (docs/04-frontend-ux.md §7).
const TOTAL_BEATS = 4

export function DebriefPanel({
  level,
  winningInputs,
  isReplay,
  hasNextJob,
  onNext,
  onReplay,
}: DebriefPanelProps) {
  const { t } = useTranslation()
  const composed = useMemo(
    () => compose(level.query.template, winningInputs),
    [level.query.template, winningInputs],
  )
  const narrative = getJobNarrative(level.id)
  // Two-level stack selector: flat tabs -> language groups (each with its
  // framework/driver options). Both sides use the SAME model so one selector can
  // drive them together; the vulnerable side is per-stack when the level ships
  // vulnerableCodeVariants, else its single vulnerableCode folded to one group.
  // Memoized on the (stable) debrief.
  const secureGroups = useMemo(
    () => groupSecureSnippets(selectSecureSnippets(level.debrief)),
    [level.debrief],
  )
  const vulnerableGroups = useMemo(
    () => groupSecureSnippets(selectVulnerableSnippets(level.debrief)),
    [level.debrief],
  )
  const [revealed, setRevealed] = useState(isReplay ? TOTAL_BEATS : 1)
  const allRevealed = revealed >= TOTAL_BEATS

  return (
    <section className={cx('container', styles.wrap)}>
      <header className={styles.header}>
        <Stamp>{t('game.debrief.stamp')}</Stamp>
        <h1 className={styles.title} data-phase-heading tabIndex={-1}>
          {level.title}
        </h1>
      </header>

      <p className={styles.fixerIntro}>
        <span className={styles.fixerTag}>{t('game.debrief.fixerTag')}</span>
        {DEBRIEF_INTRO}
      </p>

      {/* No aria-live here: each SqlPreview owns its own (debounced) live region,
          so a wrapper live region would double-speak. Beats are user-revealed and
          navigable by their <h2> headings. */}
      <ol className={styles.beats}>
        {revealed >= 1 && (
          <li className={styles.beat}>
            <h2 className={styles.beatHead}>{t('game.debrief.beat1')}</h2>
            <p className={styles.beatText}>{t('game.debrief.beat1Text')}</p>
            <SqlPreview segments={composed.segments} />
          </li>
        )}

        {revealed >= 2 && (
          <li className={styles.beat}>
            <h2 className={styles.beatHead}>{t('game.debrief.beat2')}</h2>
            {narrative && (
              <p className={cx('prose', styles.transition)}>{narrative.debrief.transition}</p>
            )}
            <p className={cx('prose', styles.beatText)}>{level.debrief.explanation}</p>
          </li>
        )}

        {revealed >= 3 && (
          <li className={styles.beat}>
            <h2 className={styles.beatHead}>{t('game.debrief.beat3')}</h2>
            <CodeCompare vulnerableGroups={vulnerableGroups} secureGroups={secureGroups} />
          </li>
        )}

        {revealed >= 4 && (
          <li className={cx(styles.beat, styles.takeawayBeat)}>
            <h2 className={styles.beatHead}>{t('game.debrief.beat4')}</h2>
            <p className={styles.takeaway}>
              <IconCheck size={18} />
              <span>{level.debrief.takeaway}</span>
            </p>
          </li>
        )}
      </ol>

      <div className={styles.actions}>
        {!allRevealed ? (
          <Button
            variant="primary"
            onClick={() => setRevealed((r) => Math.min(TOTAL_BEATS, r + 1))}
            iconRight={<IconArrowRight size={18} />}
          >
            {t('game.debrief.continue')}
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onReplay}>
              {t('game.debrief.runCleaner')}
            </Button>
            {hasNextJob ? (
              <Button variant="success" onClick={onNext} iconRight={<IconArrowRight size={18} />}>
                {t('game.debrief.nextJob')}
              </Button>
            ) : (
              <Link href="/jobs" className="btn btn--success">
                <span>{t('game.debrief.walkAway')}</span>
                <IconArrowRight size={18} />
              </Link>
            )}
          </>
        )}
      </div>
    </section>
  )
}
