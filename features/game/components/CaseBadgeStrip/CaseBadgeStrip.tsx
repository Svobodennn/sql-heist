'use client'

import type { CaseMeta } from '../../cases'
import type { CaseProgressMap } from '../../lib/useCaseProgress'
import { badgeSummary, computeCaseBadges } from '../../lib/badges'
import { caseCompletion } from '../../lib/useCaseProgress'
import { cx } from '@/ui/cx'
import { Stamp } from '../Stamp'
import { IconAward, IconCheck } from '../icons'
import styles from './CaseBadgeStrip.module.css'

// Per-technique mastery strip on the Case Board — the case-native revival of the old
// jobs BadgeStrip (removed with the jobs flow; badges.ts stayed). Each of the 8
// technique slots lights up once the player CLEARS the objective teaching it; state
// is derived purely in features/game/lib/badges from the board's case→objective→
// technique metadata + localStorage progress. Meaning rides on icon + label + an
// "earned/locked" word, never color alone (§11). Also tallies cases fully closed.
export function CaseBadgeStrip({
  cases,
  records,
}: {
  cases: CaseMeta[]
  records: CaseProgressMap
}) {
  const badges = computeCaseBadges(cases, records)
  const { earned, total } = badgeSummary(badges)
  const closed = cases.filter(
    (c) => caseCompletion(c.id, c.objectives.map((o) => o.id), records).complete,
  ).length

  return (
    <section
      className={styles.wrap}
      aria-label={`Technique mastery: ${earned} of ${total}. ${closed} of ${cases.length} cases closed.`}
    >
      <div className={styles.head}>
        <Stamp>Mastery</Stamp>
        <span className={cx('mono', styles.tally)} aria-hidden="true">
          {earned}/{total}
        </span>
        <span className={styles.closed} aria-hidden="true">
          {closed} / {cases.length} cases closed
        </span>
      </div>

      <ul className={styles.strip}>
        {badges.map((b) => (
          <li
            key={b.id}
            className={cx(styles.badge, b.earned ? styles.earned : styles.locked)}
            aria-label={`${b.label} — ${b.earned ? 'mastered' : 'locked'}`}
          >
            <span className={styles.icon} aria-hidden="true">
              {b.earned ? <IconCheck size={15} /> : <IconAward size={15} />}
            </span>
            <span className={styles.label}>{b.label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
