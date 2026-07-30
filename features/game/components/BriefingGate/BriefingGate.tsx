'use client'

import { cx } from '@/ui/cx'
import { Button } from '../Button'
import { Stamp } from '../Stamp'
import { IconArrowRight, IconTarget } from '../icons'
import styles from './BriefingGate.module.css'

// The briefing GATE (docs/cases-design.md — "briefing + … the active objective's
// exploit surface"). Entering a case now opens on the brief ALONE — the Fixer's
// pitch and a single "Take the case" CTA — instead of dumping brief + plan + recon +
// exploit on one screen. Clicking through hands the player to the active objective.
// Render-only; the CasePlayer owns the stage. The heading carries the phase-swap
// focus marker so a return to this gate (never on initial mount) lands here.
interface BriefingGateProps {
  briefing: { handler: string; text: string }
  objectiveCount: number
  onStart: () => void
}

export function BriefingGate({ briefing, objectiveCount, onStart }: BriefingGateProps) {
  return (
    <section className={cx('panel', styles.gate)} aria-label="Case briefing">
      <div className={styles.head}>
        <Stamp>The brief</Stamp>
        <span className={cx('mono', styles.handler)}>{briefing.handler}</span>
      </div>

      <h2 className={styles.heading} data-objective-heading tabIndex={-1}>
        Here&rsquo;s the job.
      </h2>

      <p className={cx('prose', styles.text)}>{briefing.text}</p>

      <p className={styles.meta}>
        <IconTarget size={16} />
        <span>
          <span className="mono">{objectiveCount}</span> objective
          {objectiveCount === 1 ? '' : 's'} — one at a time. Each one tells you what to do, why,
          and how you&rsquo;ll know it landed.
        </span>
      </p>

      <div className={styles.actions}>
        <Button variant="primary" onClick={onStart} iconRight={<IconArrowRight size={18} />}>
          Take the case
        </Button>
      </div>
    </section>
  )
}
