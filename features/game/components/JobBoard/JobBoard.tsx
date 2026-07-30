'use client'

import type { JobMeta } from '../../levels'
import { cx } from '@/ui/cx'
import { groupByAct } from '../../lib/actBoard'
import { rankForScore } from '../../lib/narrative'
import { isUnlocked, useProgress } from '../../lib/useProgress'
import { useTranslation } from '@/i18n/useTranslation'
import { BadgeStrip } from '../BadgeStrip'
import { Stamp } from '../Stamp'
import { JobCard, type JobCardState } from '../JobCard'
import styles from './JobBoard.module.css'

// Crew HQ / Job Board (docs/04-frontend-ux.md §8, ws3-design.md: "Board shows
// Act I / Act II"). Client component: reads localStorage progress to derive
// completed/active/locked (linear unlock). Jobs are grouped into headed Act
// sections; with only the 3 MVP levels present, Act II simply doesn't render until
// the parent merges the advanced levels (groupByAct returns non-empty acts only).
export function JobBoard({ jobs }: { jobs: JobMeta[] }) {
  const { t } = useTranslation()
  const { records, ready } = useProgress()
  const orderedIds = jobs.map((j) => j.id)
  const sections = groupByAct(jobs)

  const totalScore = jobs.reduce((sum, j) => sum + (records[j.id]?.bestScore ?? 0), 0)

  const cardState = (job: JobMeta): JobCardState => {
    if (records[job.id]?.completed) return 'completed'
    if (ready && isUnlocked(orderedIds, job.id, records)) return 'active'
    // Before hydration, only the first job is treated as open.
    if (!ready) return job.order === 1 ? 'active' : 'locked'
    return 'locked'
  }

  return (
    <section className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <Stamp>{t('game.board.stamp')}</Stamp>
          {/* Heading text is asserted by tests/e2e/support.ts — the en catalog value
              for game.board.title is pinned to "Three jobs. One score." for that. */}
          <h1 className={styles.title}>{t('game.board.title')}</h1>
          <p className={styles.sub}>{t('game.board.sub')}</p>
        </div>
        {totalScore > 0 && (
          <div className={styles.rank}>
            <Stamp>{t('game.board.rank')}</Stamp>
            <p className={styles.rankName}>{rankForScore(totalScore).name}</p>
            <span className={cx('mono', styles.rankScore)}>Σ {totalScore}</span>
          </div>
        )}
      </header>

      <BadgeStrip metas={jobs} records={records} />

      {sections.map((sec) => (
        <section key={sec.act} className={styles.act} aria-label={sec.title}>
          <div className={styles.actHead}>
            <h2 className={styles.actTitle}>{sec.title}</h2>
            <p className={styles.actTagline}>{sec.tagline}</p>
          </div>
          <ul className={styles.grid}>
            {sec.jobs.map((job) => {
              const globalIndex = orderedIds.indexOf(job.id)
              return (
                <JobCard
                  key={job.id}
                  meta={job}
                  state={cardState(job)}
                  bestScore={records[job.id]?.bestScore}
                  prevJob={globalIndex > 0 ? jobs[globalIndex - 1].job : undefined}
                />
              )
            })}
          </ul>
        </section>
      ))}
    </section>
  )
}
