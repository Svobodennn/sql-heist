'use client'

import type { TechniqueId } from '@/lib/schema/level'
import { cx } from '@/ui/cx'
import { useTranslation } from '@/i18n/useTranslation'
import { Stamp } from '../Stamp'
import { IconCheck, IconTarget } from '../icons'
import styles from './ObjectiveBanner.module.css'

// The clarity fix (docs/cases-design.md — "always visible: goal + why + done-when").
// This banner makes the current ask impossible to miss: the WHAT (goal) is the
// prominent heading, the WHY (stakes) and HOW-YOU-KNOW (done-when) sit right under
// it, and a technique badge names the move. The structural labels come from the i18n
// catalog (game.case.*); the goal/why/doneWhen/approach VALUES are localized case
// content passed in by the CasePlayer.
interface ObjectiveBannerProps {
  index: number // zero-based position of the active objective
  total: number
  goal: string
  why: string
  doneWhen: string
  approach?: string // plain-language "where to look / why" orientation (no SQL)
  technique: TechniqueId
}

export function ObjectiveBanner({
  index,
  total,
  goal,
  why,
  doneWhen,
  approach,
  technique,
}: ObjectiveBannerProps) {
  const { t } = useTranslation()
  return (
    <section className={cx('panel', styles.banner)} aria-label="Current objective">
      <div className={styles.head}>
        <Stamp>{t('game.case.objective.counter', { index: index + 1, total })}</Stamp>
        <span className={cx('mono', styles.badge)}>{t(`game.technique.${technique}`)}</span>
      </div>

      <h2 className={styles.goal} data-objective-heading tabIndex={-1}>
        <IconTarget size={20} />
        <span>{goal}</span>
      </h2>

      {approach && (
        <p className={styles.angle}>
          <span className={styles.angleLabel}>{t('game.case.objective.angle')}</span>
          <span className={styles.angleText}>{approach}</span>
        </p>
      )}

      <dl className={styles.meta}>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>{t('game.case.objective.why')}</dt>
          <dd className={styles.metaValue}>{why}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt className={styles.metaLabel}>{t('game.case.objective.doneWhen')}</dt>
          <dd className={cx(styles.metaValue, styles.doneWhen)}>
            <IconCheck size={15} />
            <span>{doneWhen}</span>
          </dd>
        </div>
      </dl>
    </section>
  )
}
