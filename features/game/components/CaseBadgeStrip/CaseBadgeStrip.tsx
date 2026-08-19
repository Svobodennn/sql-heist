'use client'

import type { CaseMeta } from '../../cases'
import type { CaseProgressMap } from '../../lib/useCaseProgress'
import { badgeSummary, computeCaseBadges } from '../../lib/badges'
import { caseCompletion } from '../../lib/useCaseProgress'
import { cx } from '@/ui/cx'
import { useTranslation } from '@/i18n/useTranslation'
import { Stamp } from '../Stamp'
import { IconAward, IconCheck } from '../icons'
import styles from './CaseBadgeStrip.module.css'

// Per-technique mastery strip on the Case Board. Each of the 8 technique slots lights
// up once the player CLEARS the objective teaching it; state is derived in
// features/game/lib/badges from case→objective→technique metadata + localStorage.
// Meaning rides on icon + label + an "earned/locked" word, never color alone (§11).
// Labels come from the i18n catalog (game.technique.* + game.badges.*).
export function CaseBadgeStrip({
  cases,
  records,
}: {
  cases: CaseMeta[]
  records: CaseProgressMap
}) {
  const { t } = useTranslation()
  const badges = computeCaseBadges(cases, records)
  const { earned, total } = badgeSummary(badges)
  const closed = cases.filter(
    (c) => caseCompletion(c.id, c.objectives.map((o) => o.id), records).complete,
  ).length

  return (
    <section
      className={styles.wrap}
      aria-label={t('game.badges.summaryAria', { earned, total, closed, cases: cases.length })}
    >
      <div className={styles.head}>
        <Stamp>{t('game.badges.mastery')}</Stamp>
        <span className={cx('mono', styles.tally)} aria-hidden="true">
          {earned}/{total}
        </span>
        <span className={styles.closed} aria-hidden="true">
          {t('game.badges.casesClosed', { closed, total: cases.length })}
        </span>
      </div>

      <ul className={styles.strip}>
        {badges.map((b) => {
          const label = t(`game.technique.${b.id}`)
          return (
            <li
              key={b.id}
              className={cx(styles.badge, b.earned ? styles.earned : styles.locked)}
              aria-label={t('game.badges.itemAria', {
                label,
                status: b.earned ? t('game.badges.mastered') : t('game.badges.locked'),
              })}
            >
              <span className={styles.icon} aria-hidden="true">
                {b.earned ? <IconCheck size={15} /> : <IconAward size={15} />}
              </span>
              <span className={styles.label}>{label}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
