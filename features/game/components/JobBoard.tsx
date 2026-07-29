'use client'

import type { JobMeta } from '../levels'
import { cx } from '../lib/cx'
import { rankForScore } from '../lib/narrative'
import { isUnlocked, useProgress } from '../lib/useProgress'
import { Stamp } from './Stamp'
import { JobCard, type JobCardState } from './JobCard'
import styles from './JobBoard.module.css'

// Crew HQ / Job Board (docs/04-frontend-ux.md §8). Client component: reads
// localStorage progress to derive completed/active/locked. Linear unlock. Until
// hydration completes it renders the locked-but-first baseline (no SSR mismatch).
export function JobBoard({ jobs }: { jobs: JobMeta[] }) {
  const { records, ready } = useProgress()
  const orderedIds = jobs.map((j) => j.id)

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
          <Stamp>THE BOARD</Stamp>
          <h1 className={styles.title}>Three jobs. One score.</h1>
          <p className={styles.sub}>
            Pull each one off with a SQL injection, then learn the fix. Progress stays on this
            device.
          </p>
        </div>
        {totalScore > 0 && (
          <div className={styles.rank}>
            <Stamp>Rank</Stamp>
            <p className={styles.rankName}>{rankForScore(totalScore).name}</p>
            <span className={cx('mono', styles.rankScore)}>Σ {totalScore}</span>
          </div>
        )}
      </header>

      <ul className={styles.grid}>
        {jobs.map((job, i) => (
          <JobCard
            key={job.id}
            meta={job}
            state={cardState(job)}
            bestScore={records[job.id]?.bestScore}
            prevJob={i > 0 ? jobs[i - 1].job : undefined}
          />
        ))}
      </ul>
    </section>
  )
}
