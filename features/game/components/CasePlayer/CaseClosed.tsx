'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/i18n/useTranslation'
import { localeHref } from '@/i18n/localeHref'
import type { Case, Objective } from '@/lib/schema/case'
import { compose } from '@/lib/engine/queryComposer'
import { cx } from '@/ui/cx'
import { groupSecureSnippets, selectSecureSnippets, selectVulnerableSnippets } from '../../lib/secureCode'
import { CodeCompare } from '../CodeCompare'
import { SignalPanel } from '../SignalPanel'
import { SqlPreview } from '../SqlPreview'
import { Stamp } from '../Stamp'
import { IconArrowRight, IconCheck } from '../icons'
import styles from './CasePlayer.module.css'
import type { ObjectiveReceipt, ObjectiveReceiptMap } from './objectiveReceipt'

// The case payoff (docs/cases-design.md — "After the last objective: a case-closed
// screen (headline + fixer) followed by the per-objective defense debriefs").
//
// The per-objective defense reuses the SAME teaching machinery the jobs' DebriefPanel
// is built from — CodeCompare (vulnerable ↔ secure) + the secureCode selectors — rather
// than the Level-coupled DebriefPanel orchestrator itself (it carries a beat-reveal and a
// per-level "next job / walk away" footer that don't fit an at-once case recap, and would
// need a fabricated Level per objective). Each objective shows the winning MOVE (its
// canonical expectedSolution, composed through the frozen composer) → the flaw → the fix →
// the takeaway. Read-only, all revealed at once.
export function CaseClosed({
  gameCase,
  receipts,
  onReplay,
}: {
  gameCase: Case
    // Per-objective first-winning-run evidence from this session; absent on a cold revisit.
    receipts?: ObjectiveReceiptMap
  onReplay: () => void
}) {
  const { t, locale } = useTranslation()
  const { caseClosed } = gameCase
  return (
    <section className={styles.closed}>
      <header className={styles.closedHead}>
        <Stamp>{t('game.case.closed.stamp')}</Stamp>
        <h2 className={styles.closedHeadline} data-objective-heading tabIndex={-1}>
          {caseClosed.headline}
        </h2>
        <p className={styles.fixer}>
          <span className={styles.fixerTag}>{gameCase.briefing.handler}</span>
          {caseClosed.fixer}
        </p>
      </header>

      <div className={styles.defenseIntro}>
        <Stamp>{t('game.case.closed.defense')}</Stamp>
        <p className={styles.defenseSub}>{t('game.case.closed.defenseSub')}</p>
      </div>

      <ol className={styles.defenseList}>
        {gameCase.objectives.map((objective, index) => (
          <ObjectiveDefense
            key={objective.id}
            objective={objective}
            index={index}
            receipt={receipts?.[objective.id]}
          />
        ))}
      </ol>

      <div className={styles.closedActions}>
        <button type="button" className="btn btn--ghost" onClick={onReplay}>
          <span>{t('game.case.closed.replay')}</span>
        </button>
        <Link href={localeHref('/cases', locale)} className="btn btn--success">
          <span>{t('game.case.closed.back')}</span>
          <IconArrowRight size={18} />
        </Link>
      </div>
    </section>
  )
}

function ObjectiveDefense({
  objective,
  index,
  receipt,
}: {
  objective: Objective
  index: number
  receipt?: ObjectiveReceipt
}) {
  const { t } = useTranslation()
  // The winning move for this objective. Prefer what the PLAYER actually typed this
  // session (threaded from CasePlayer); on a cold revisit those inputs are gone, so fall
  // back to the authored expectedSolution. The raw payload and the live preview are built
  // from the SAME inputs, so "what you typed" and the highlighted SQL never disagree.
  const inputsUsed = receipt?.inputs ?? objective.expectedSolution.inputs
  const composed = useMemo(
    () => receipt?.composed ?? compose(objective.query.template, inputsUsed, objective.query.inputFilter),
    [objective.query.template, objective.query.inputFilter, inputsUsed, receipt],
  )
  const secureGroups = useMemo(
    () => groupSecureSnippets(selectSecureSnippets(objective.debrief)),
    [objective.debrief],
  )
  const vulnerableGroups = useMemo(
    () => groupSecureSnippets(selectVulnerableSnippets(objective.debrief)),
    [objective.debrief],
  )

  return (
    <li className={cx('panel', styles.defense)}>
      <div className={styles.defenseHeader}>
        <Stamp>{t('game.case.closed.objective', { index: index + 1 })}</Stamp>
        <span className={cx('mono', styles.defenseBadge)}>
          {t(`game.technique.${objective.technique}`)}
        </span>
      </div>
      <h3 className={styles.defenseGoal}>{objective.goal}</h3>

      <div className={styles.moveReceipt}>
        <section className={styles.receiptMove} aria-labelledby={`move-${objective.id}`}>
          <p id={`move-${objective.id}`} className={styles.moveLabel}>
            {t('game.case.closed.yourMove')}
          </p>
          <dl className={styles.receiptInputs}>
            {objective.fields.map((field) => (
              <div key={field.name}>
                <dt>{field.label}</dt>
                <dd className="mono">{inputsUsed[field.name] || '∅'}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={styles.receiptSql} aria-labelledby={`sql-${objective.id}`}>
          <p id={`sql-${objective.id}`} className={styles.moveLabel}>
            {t('game.case.closed.composedSql')}
          </p>
          <SqlPreview segments={composed.segments} />
        </section>

        <section
          className={styles.receiptResult}
          aria-labelledby={`result-${objective.id}`}
          data-runtime-evidence={receipt ? 'present' : 'missing'}
        >
          <p id={`result-${objective.id}`} className={styles.moveLabel}>
            {t('game.case.closed.observedResult')}
          </p>
          {receipt ? (
            <SignalPanel
              signal={receipt.signal}
              result={receipt.result}
              winCondition={objective.winCondition}
            />
          ) : (
            <p className={styles.receiptEmpty}>{t('game.case.closed.sessionEvidenceMissing')}</p>
          )}
        </section>
      </div>

      <p className={cx('prose', styles.explanation)}>{objective.debrief.explanation}</p>

      <CodeCompare vulnerableGroups={vulnerableGroups} secureGroups={secureGroups} />

      <p className={styles.takeaway}>
        <IconCheck size={18} />
        <span>{objective.debrief.takeaway}</span>
      </p>
    </li>
  )
}
