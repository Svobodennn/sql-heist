'use client'

import type { JobMeta } from '../../levels'
import type { ProgressMap } from '../../lib/useProgress'
import { badgeSummary, computeBadges } from '../../lib/badges'
import { cx } from '@/ui/cx'
import { useTranslation } from '@/i18n/useTranslation'
import { IconAward, IconCheck } from '../icons'
import { Stamp } from '../Stamp'
import styles from './BadgeStrip.module.css'

// Per-technique mastery strip (docs/ws3-design.md "UI scope"). Renders all 8
// technique slots; each lights up once the player CLEARS a job teaching it (state
// derived purely in features/game/lib/badges from board metas + localStorage
// progress). With only the 3 MVP levels registered, the 5 Act II slots render
// locked until the parent merges them — degrades gracefully. Meaning rides on
// icon + label + an "earned/locked" word, never on color alone (§11).
export function BadgeStrip({ metas, records }: { metas: JobMeta[]; records: ProgressMap }) {
  const { t } = useTranslation()
  const completed = new Set(Object.keys(records).filter((id) => records[id]?.completed))
  const badges = computeBadges(metas, completed)
  const { earned, total } = badgeSummary(badges)

  return (
    <section className={styles.wrap} aria-label={t('game.badges.aria', { earned, total })}>
      <div className={styles.head}>
        <Stamp>{t('game.badges.mastery')}</Stamp>
        <span className={cx('mono', styles.tally)} aria-hidden="true">
          {earned}/{total}
        </span>
      </div>
      <ul className={styles.strip}>
        {badges.map((b) => (
          <li
            key={b.id}
            className={cx(styles.badge, b.earned ? styles.earned : styles.locked)}
            aria-label={t('game.badges.itemAria', {
              label: b.label,
              status: b.earned ? t('game.badges.mastered') : t('game.badges.locked'),
            })}
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
