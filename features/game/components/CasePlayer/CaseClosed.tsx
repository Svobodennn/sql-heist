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
import { SqlPreview } from '../SqlPreview'
import { Stamp } from '../Stamp'
import { IconArrowRight, IconCheck } from '../icons'
import styles from './CasePlayer.module.css'

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
  solvedInputs,
  onReplay,
}: {
  gameCase: Case
  // Per-objective winning inputs from this session's play; absent on a cold revisit.
  solvedInputs?: Record<string, Record<string, string>>
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
            playerInputs={solvedInputs?.[objective.id]}
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
  playerInputs,
}: {
  objective: Objective
  index: number
  playerInputs?: Record<string, string>
}) {
  const { t } = useTranslation()
  // The winning move for this objective. Prefer what the PLAYER actually typed this
  // session (threaded from CasePlayer); on a cold revisit those inputs are gone, so fall
  // back to the authored expectedSolution. The raw payload and the live preview are built
  // from the SAME inputs, so "what you typed" and the highlighted SQL never disagree.
  const inputsUsed = playerInputs ?? objective.expectedSolution.inputs
  const composed = useMemo(
    () => compose(objective.query.template, inputsUsed),
    [objective.query.template, inputsUsed],
  )
  // The raw values the player entered — only the fields they actually filled.
  const typed = useMemo(
    () =>
      objective.fields
        .map((f) => ({ name: f.name, label: f.label, value: inputsUsed[f.name] ?? '' }))
        .filter((e) => e.value.length > 0),
    [objective.fields, inputsUsed],
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

      <div className={styles.moveBlock}>
        <p className={styles.moveLabel}>{t('game.case.closed.move')}</p>
        {typed.length > 0 && (
          <div className={styles.typed}>
            <span className={styles.typedLabel}>{t('game.case.closed.typed')}</span>
            <span className={styles.typedValues}>
              {typed.map((e) => (
                <code key={e.name} className={cx('mono', styles.typedValue)}>
                  {typed.length > 1 && <span className={styles.typedField}>{e.label}: </span>}
                  {e.value}
                </code>
              ))}
            </span>
          </div>
        )}
        <SqlPreview segments={composed.segments} />
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
