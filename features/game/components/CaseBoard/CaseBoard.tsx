'use client'

import type { CaseMeta } from '../../cases'
import { useCaseProgress } from '../../lib/useCaseProgress'
import { Stamp } from '../Stamp'
import { CaseBadgeStrip } from '../CaseBadgeStrip'
import { CaseCard } from '../CaseCard'
import styles from './CaseBoard.module.css'

// Case Board (docs/cases-design.md — replaces the Job Board). The case twin of
// JobBoard: a client component that reads localStorage progress to show each
// case's completion. Progress is a clamped count (cleared objective ids vs the
// case's objective count) so the board never needs the objective ids — it stays a
// thin metadata surface that ships no SQL. First client render uses empty records
// (matches the server baseline) then fills after mount → no hydration mismatch.
export function CaseBoard({ cases }: { cases: CaseMeta[] }) {
  const { records } = useCaseProgress()

  const doneFor = (meta: CaseMeta) =>
    Math.min(records[meta.id]?.objectives.length ?? 0, meta.objectiveCount)

  const totalObjectives = cases.reduce((n, c) => n + c.objectiveCount, 0)
  const clearedCases = cases.filter((c) => doneFor(c) >= c.objectiveCount && c.objectiveCount > 0)
    .length
  const targets = new Set(cases.map((c) => c.appName))
  const primaryTarget = targets.size === 1 ? [...targets][0] : 'the target'

  return (
    <section className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <Stamp>Case files</Stamp>
          <h1 className={styles.title}>Pick your mark.</h1>
          <p className={styles.sub}>
            {cases.length} breaches · {totalObjectives} objectives against {primaryTarget}. Every
            case answers what, why, and how you know it landed.
          </p>
        </div>
        {clearedCases > 0 && (
          <div className={styles.tally}>
            <Stamp>Cleared</Stamp>
            <p className={styles.tallyValue}>
              <span className="mono">{clearedCases}</span> / {cases.length} cases
            </p>
          </div>
        )}
      </header>

      <CaseBadgeStrip cases={cases} records={records} />

      <ul className={styles.grid}>
        {cases.map((meta) => (
          <CaseCard key={meta.id} meta={meta} done={doneFor(meta)} />
        ))}
      </ul>
    </section>
  )
}
