'use client'

import { useMemo, useState } from 'react'
import type { Level } from '@/lib/schema/level'
import { compose } from '@/lib/engine/queryComposer'
import { cx } from '../lib/cx'
import { Button } from './Button'
import { CodeCompare } from './CodeCompare'
import { SqlPreview } from './SqlPreview'
import { Stamp } from './Stamp'
import { IconArrowRight, IconCheck } from './icons'
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

export function DebriefPanel({
  level,
  winningInputs,
  isReplay,
  hasNextJob,
  onNext,
  onReplay,
}: DebriefPanelProps) {
  const composed = useMemo(
    () => compose(level.query.template, winningInputs),
    [level.query.template, winningInputs],
  )
  const totalBeats = 4
  const [revealed, setRevealed] = useState(isReplay ? totalBeats : 1)
  const allRevealed = revealed >= totalBeats

  return (
    <section className={cx('container', styles.wrap)}>
      <header className={styles.header}>
        <Stamp>Debrief — Attack → Defense</Stamp>
        <h1 className={styles.title}>{level.title}</h1>
      </header>

      <ol className={styles.beats} aria-live="polite">
        {revealed >= 1 && (
          <li className={styles.beat}>
            <p className={styles.beatHead}>① The move</p>
            <p className={styles.beatText}>The payload you handed the front, on the wire:</p>
            <SqlPreview segments={composed.segments} />
          </li>
        )}

        {revealed >= 2 && (
          <li className={styles.beat}>
            <p className={styles.beatHead}>② Why it worked</p>
            <p className={cx('prose', styles.beatText)}>{level.debrief.explanation}</p>
          </li>
        )}

        {revealed >= 3 && (
          <li className={styles.beat}>
            <p className={styles.beatHead}>③ The fix</p>
            <CodeCompare
              vulnerable={level.debrief.vulnerableCode}
              secure={level.debrief.secureCode}
            />
          </li>
        )}

        {revealed >= 4 && (
          <li className={cx(styles.beat, styles.takeawayBeat)}>
            <p className={styles.beatHead}>④ Takeaway</p>
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
            onClick={() => setRevealed((r) => Math.min(totalBeats, r + 1))}
            iconRight={<IconArrowRight size={18} />}
          >
            Continue
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onReplay}>
              Run it back
            </Button>
            {hasNextJob && (
              <Button variant="success" onClick={onNext} iconRight={<IconArrowRight size={18} />}>
                Next job
              </Button>
            )}
          </>
        )}
      </div>
    </section>
  )
}
