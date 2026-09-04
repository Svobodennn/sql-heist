'use client'

import type { CaseMeta } from '../../cases'
import { useCaseProgress } from '../../lib/useCaseProgress'
import { useTranslation } from '@/i18n/useTranslation'
import { Stamp } from '../Stamp'
import { CaseBadgeStrip } from '../CaseBadgeStrip'
import { CaseCard } from '../CaseCard'
import styles from './CaseBoard.module.css'

// Case Board — a client component that reads localStorage progress to show each
// case's completion. Progress is a clamped count so the board ships no SQL. First
// client render uses empty records (matches the server baseline) then fills after
// mount → no hydration mismatch. Structural labels come from the i18n catalog.
export function CaseBoard({ cases }: { cases: CaseMeta[] }) {
  const { t } = useTranslation()
  const { records } = useCaseProgress()

  const doneFor = (meta: CaseMeta) =>
    Math.min(records[meta.id]?.objectives.length ?? 0, meta.objectiveCount)

  const totalObjectives = cases.reduce((n, c) => n + c.objectiveCount, 0)
  const clearedCases = cases.filter((c) => doneFor(c) >= c.objectiveCount && c.objectiveCount > 0)
    .length
  const targets = new Set(cases.map((c) => c.appName))
  const primaryTarget = targets.size === 1 ? [...targets][0] : t('game.case.board.targetFallback')

  return (
    <section className={styles.wrap}>
      <header className={styles.header} data-reveal>
        <div className={styles.headerCopy}>
          <Stamp>{t('game.case.board.stamp')}</Stamp>
          <h1 className={styles.title}>{t('game.case.board.title')}</h1>
          <p className={styles.sub}>
            {t('game.case.board.sub', {
              cases: cases.length,
              objectives: totalObjectives,
              target: primaryTarget,
            })}
          </p>
        </div>
        {clearedCases > 0 && (
          <div className={styles.tally}>
            <Stamp>{t('game.case.board.clearedStamp')}</Stamp>
            <p className={styles.tallyValue}>
              {t('game.case.board.tally', { cleared: clearedCases, total: cases.length })}
            </p>
          </div>
        )}
      </header>

      <div data-reveal>
        <CaseBadgeStrip cases={cases} records={records} />
      </div>

      <ul className={styles.grid}>
        {cases.map((meta) => (
          <CaseCard key={meta.id} meta={meta} done={doneFor(meta)} />
        ))}
      </ul>
    </section>
  )
}
