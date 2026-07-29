'use client'

import type { Level } from '@/lib/schema/level'
import type { EngineStatus } from '../lib/useEngine'
import { cx } from '../lib/cx'
import { Button } from './Button'
import { HandlerCard } from './HandlerCard'
import { Stamp } from './Stamp'
import { IconArrowRight, IconTarget } from './icons'
import styles from './BriefPanel.module.css'

// Screen 1 — BRIEF (docs/04-frontend-ux.md §3). Asymmetric dossier: handler on
// the wide left, target dossier on the narrow right, CTA bottom-right. The engine
// warms up in the background here; Recon needs no engine so the CTA never blocks.
export function BriefPanel({
  level,
  engineStatus,
  onTakeJob,
}: {
  level: Level
  engineStatus: EngineStatus
  onTakeJob: () => void
}) {
  return (
    <section className={cx('container', styles.wrap)}>
      <div className={styles.topline}>
        <Stamp>Case File — {level.job}</Stamp>
        <Stamp className={styles.difficulty}>Difficulty · {level.difficulty}</Stamp>
      </div>

      <h1 className={styles.screenHeading} data-phase-heading tabIndex={-1}>
        {level.title}
      </h1>

      <div className={styles.grid}>
        <HandlerCard handler={level.brief.handler} text={level.brief.text} />

        <aside className={cx('panel', styles.dossier)}>
          <div className={styles.dossierBlock}>
            <Stamp>Target</Stamp>
            <p className={styles.appName}>{level.target.appName}</p>
            <p className={styles.meta}>
              surface · <span className="mono">{level.target.surface}</span>
            </p>
          </div>
          <div className={styles.dossierBlock}>
            <Stamp>Objective</Stamp>
            <p className={styles.objective}>
              <IconTarget size={16} />
              <span>{level.brief.objective}</span>
            </p>
          </div>
        </aside>
      </div>

      <div className={styles.actions}>
        {engineStatus === 'loading' && (
          <span className={styles.prep} aria-live="polite">
            prepping the gear…
          </span>
        )}
        <Button variant="primary" onClick={onTakeJob} iconRight={<IconArrowRight size={18} />}>
          Take the job
        </Button>
      </div>
    </section>
  )
}
