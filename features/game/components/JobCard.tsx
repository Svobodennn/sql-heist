'use client'

import Link from 'next/link'
import { starsForScore } from '@/lib/engine/scoring'
import type { JobMeta } from '../levels'
import { cx } from '../lib/cx'
import { STAR_TIER_LABELS, type StarTier } from '../lib/narrative'
import { IconArrowRight, IconCheck, IconLock, IconStar } from './icons'
import styles from './JobCard.module.css'

export type JobCardState = 'completed' | 'active' | 'locked'

// Job Board card (docs/04-frontend-ux.md §8). Three states carried by icon +
// label + position + color (never color alone): completed (check + stars),
// active (brass "Take job"), locked (lock + prerequisite line).
export function JobCard({
  meta,
  state,
  bestScore,
  prevJob,
}: {
  meta: JobMeta
  state: JobCardState
  bestScore?: number
  prevJob?: string
}) {
  const stars = bestScore != null ? starsForScore(bestScore) : 0
  const index = String(meta.order).padStart(2, '0')

  const body = (
    <>
      <div className={styles.top}>
        <span className={cx('mono', styles.index)}>{index}</span>
        <span className={cx(styles.statusTag, styles[`tag--${state}`])}>
          {state === 'completed' && <IconCheck size={13} />}
          {state === 'locked' && <IconLock size={13} />}
          {state === 'completed' ? 'Cleared' : state === 'active' ? 'Open' : 'Locked'}
        </span>
      </div>

      <div>
        <h2 className={styles.title}>{meta.job}</h2>
        <p className={cx('mono', styles.technique)}>{meta.technique}</p>
      </div>

      {state === 'completed' ? (
        <div className={styles.foot}>
          <span
            className={styles.stars}
            aria-label={`${stars} of 3 stars — ${STAR_TIER_LABELS[stars as StarTier]}`}
          >
            {[1, 2, 3].map((n) => (
              <IconStar key={n} size={15} filled={n <= stars} />
            ))}
          </span>
          <span className={styles.tierWord}>{STAR_TIER_LABELS[stars as StarTier]}</span>
          <span className={cx('mono', styles.score)}>{bestScore}</span>
          <span className={styles.cta}>
            Run it cleaner <IconArrowRight size={15} />
          </span>
        </div>
      ) : state === 'active' ? (
        <span className={styles.cta}>
          Take job <IconArrowRight size={15} />
        </span>
      ) : (
        <span className={styles.lockedNote}>Finish {prevJob ?? 'the previous job'} first</span>
      )}
    </>
  )

  if (state === 'locked') {
    return <li className={cx('panel', styles.card, styles.locked)}>{body}</li>
  }

  return (
    <li className={cx('panel', styles.card, state === 'active' && styles.activeCard)}>
      <Link href={`/jobs/${meta.id}`} className={styles.link} aria-label={`${meta.job} — ${state}`}>
        {body}
      </Link>
    </li>
  )
}
