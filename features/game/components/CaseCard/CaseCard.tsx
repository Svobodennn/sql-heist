'use client'

import Link from 'next/link'
import type { CaseMeta } from '../../cases'
import { cx } from '@/ui/cx'
import { techniqueLabel } from '../../lib/caseView'
import { IconArrowRight, IconCheck } from '../icons'
import styles from './CaseCard.module.css'

export type CaseCardState = 'cleared' | 'in-progress' | 'new'

// Case Board card (docs/cases-design.md — "numbered cards 'Case 001 — The Front
// Door'"). The case twin of JobCard: three states carried by icon + label + a
// progress bar (never color alone, §11). Every case is always playable — the
// gating is WITHIN a case (its ordered objectives), not across cases — so this is
// always a link; the state only reflects how far the player got. `done` is the
// count of cleared objectives, passed by the client CaseBoard from localStorage.
export function CaseCard({ meta, done }: { meta: CaseMeta; done: number }) {
  const total = meta.objectiveCount
  const state: CaseCardState =
    done >= total && total > 0 ? 'cleared' : done > 0 ? 'in-progress' : 'new'
  const statusLabel =
    state === 'cleared' ? 'Cleared' : state === 'in-progress' ? 'In progress' : 'Open'
  const cta = state === 'cleared' ? 'Run it back' : state === 'in-progress' ? 'Continue' : 'Case open'
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <li className={cx('panel', styles.card, state === 'cleared' && styles.clearedCard)}>
      <Link
        href={`/cases/${meta.id}`}
        className={styles.link}
        aria-label={`Case ${meta.number} — ${meta.title} (${statusLabel}, ${done} of ${total} objectives)`}
      >
        <div className={styles.top}>
          <span className={cx('mono', styles.index)}>Case {meta.number}</span>
          <span className={cx(styles.statusTag, styles[`tag--${state}`])}>
            {state === 'cleared' && <IconCheck size={13} />}
            {statusLabel}
          </span>
        </div>

        <div>
          <h2 className={styles.title}>{meta.title}</h2>
          <p className={cx('mono', styles.app)}>{meta.appName}</p>
        </div>

        <ul className={styles.techniques} aria-label="Techniques in this case">
          {meta.objectives.map((objective) => (
            <li key={objective.id} className={cx('mono', styles.chip)}>
              {techniqueLabel(objective.technique)}
            </li>
          ))}
        </ul>

        <div className={styles.foot}>
          <div
            className={styles.track}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={done}
            aria-label={`${done} of ${total} objectives cleared`}
          >
            <div className={styles.fill} style={{ transform: `scaleX(${pct / 100})` }} />
          </div>
          <div className={styles.footRow}>
            <span className={styles.progress}>
              {state === 'cleared' ? 'All objectives cleared' : `${done} / ${total} objectives`}
            </span>
            <span className={styles.cta}>
              {cta} <IconArrowRight size={15} />
            </span>
          </div>
        </div>
      </Link>
    </li>
  )
}
