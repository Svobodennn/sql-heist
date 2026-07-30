import type { TechniqueId } from '@/lib/schema/level'
import { cx } from '@/ui/cx'
import { techniqueLabel } from '../../lib/caseView'
import { Stamp } from '../Stamp'
import { IconCheck, IconTarget } from '../icons'
import styles from './ObjectiveBanner.module.css'

// The clarity fix (docs/cases-design.md — "always visible: goal + why + done-when").
// This banner makes the current ask impossible to miss: the WHAT (goal) is the
// prominent heading, the WHY (stakes) and HOW-YOU-KNOW (done-when) sit right under
// it, and a technique badge names the move. Render-only — every value is authored
// case content passed in by the CasePlayer. The goal heading is the phase-swap
// focus target (data-objective-heading, tabIndex -1) so keyboard/SR users land on
// the new ask when the objective advances.
interface ObjectiveBannerProps {
  index: number // zero-based position of the active objective
  total: number
  goal: string
  why: string
  doneWhen: string
  technique: TechniqueId
}

export function ObjectiveBanner({
  index,
  total,
  goal,
  why,
  doneWhen,
  technique,
}: ObjectiveBannerProps) {
  return (
    <section className={cx('panel', styles.banner)} aria-label="Current objective">
      <div className={styles.head}>
        <Stamp>
          Objective {index + 1}/{total}
        </Stamp>
        <span className={cx('mono', styles.badge)}>{techniqueLabel(technique)}</span>
      </div>

      <h2 className={styles.goal} data-objective-heading tabIndex={-1}>
        <IconTarget size={20} />
        <span>{goal}</span>
      </h2>

      <dl className={styles.meta}>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>Why</dt>
          <dd className={styles.metaValue}>{why}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>Done when</dt>
          <dd className={cx(styles.metaValue, styles.doneWhen)}>
            <IconCheck size={15} />
            <span>{doneWhen}</span>
          </dd>
        </div>
      </dl>
    </section>
  )
}
