'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { CaseMeta } from '../../cases'
import { cx } from '@/ui/cx'
import { useTranslation } from '@/i18n/useTranslation'
import { localeHref } from '@/i18n/localeHref'
import { IconArrowRight, IconCheck } from '../icons'
import { artworkForCase } from './caseArtwork'
import styles from './CaseCard.module.css'

export type CaseCardState = 'cleared' | 'in-progress' | 'new'

// Case Board card. Three states carried by icon + label + a progress bar (never
// color alone, §11). Every case is always playable; state only reflects how far the
// player got. Structural labels come from the i18n catalog; title/appName/technique
// are localized case metadata. `done` = cleared-objective count from localStorage.
export function CaseCard({ meta, done }: { meta: CaseMeta; done: number }) {
  const { t, locale } = useTranslation()
  const total = meta.objectiveCount
  const state: CaseCardState =
    done >= total && total > 0 ? 'cleared' : done > 0 ? 'in-progress' : 'new'
  const statusLabel =
    state === 'cleared'
      ? t('game.case.card.cleared')
      : state === 'in-progress'
        ? t('game.case.card.inProgress')
        : t('game.case.card.open')
  const cta =
    state === 'cleared'
      ? t('game.case.card.ctaCleared')
      : state === 'in-progress'
        ? t('game.case.card.ctaProgress')
        : t('game.case.card.ctaNew')
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const artwork = artworkForCase(meta.id)

  return (
    <li
      className={cx(styles.card, state === 'cleared' && styles.clearedCard)}
      data-case-id={meta.id}
      data-case-state={state}
      data-reveal
    >
      <Link
        href={localeHref(`/cases/${meta.id}`, locale)}
        className={styles.link}
        aria-label={t('game.case.card.aria', {
          number: meta.number,
          title: meta.title,
          status: statusLabel,
          done,
          total,
        })}
        data-magnetic
      >
        <div className={styles.artwork} aria-hidden="true">
          {artwork && (
            <Image
              src={artwork}
              alt=""
              width={1536}
              height={1024}
              unoptimized
              sizes="(max-width: 720px) 100vw, (max-width: 1180px) 220px, 250px"
            />
          )}
          <span className={cx('mono', styles.index)}>
            {t('game.case.header.number', { number: meta.number })}
          </span>
        </div>

        <div className={styles.copy}>
          <div className={styles.top}>
            <span className={cx(styles.statusTag, styles[`tag--${state}`])}>
              {state === 'cleared' && <IconCheck size={13} />}
              {statusLabel}
            </span>
            <span className={cx('mono', styles.objectiveCount)}>
              {done}/{total}
            </span>
          </div>
          <h2 className={styles.title}>{meta.title}</h2>
          <p className={cx('mono', styles.app)}>{meta.appName}</p>
        </div>

        <div className={styles.tradecraft}>
          <span className={styles.tradecraftLabel}>{t('game.case.card.techniquesAria')}</span>
          <ul className={styles.techniques} aria-label={t('game.case.card.techniquesAria')}>
            {meta.objectives.map((objective) => (
              <li key={objective.id} className={cx('mono', styles.chip)}>
                {t(`game.technique.${objective.technique}`)}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.foot}>
          <div
            className={styles.track}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={done}
            aria-label={t('game.case.card.progressAria', { done, total })}
          >
            <div className={styles.fill} style={{ transform: `scaleX(${pct / 100})` }} />
          </div>
          <div className={styles.footRow}>
            <span className={styles.progress}>
              {state === 'cleared'
                ? t('game.case.card.allCleared')
                : t('game.case.card.progress', { done, total })}
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
