'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useTranslation } from '@/i18n/useTranslation'
import { localeHref } from '@/i18n/localeHref'
import type { Case, Objective } from '@/lib/schema/case'
import { compose } from '@/lib/engine/queryComposer'
import { cx } from '@/ui/cx'
import { groupSecureSnippets, selectSecureSnippets, selectVulnerableSnippets } from '../../lib/secureCode'
import { techniqueLabel } from '../../lib/caseView'
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
export function CaseClosed({ gameCase, onReplay }: { gameCase: Case; onReplay: () => void }) {
  const { locale } = useTranslation()
  const { caseClosed } = gameCase
  return (
    <section className={styles.closed}>
      <header className={styles.closedHead}>
        <Stamp>Case closed</Stamp>
        <h2 className={styles.closedHeadline} data-objective-heading tabIndex={-1}>
          {caseClosed.headline}
        </h2>
        <p className={styles.fixer}>
          <span className={styles.fixerTag}>{gameCase.briefing.handler}</span>
          {caseClosed.fixer}
        </p>
      </header>

      <div className={styles.defenseIntro}>
        <Stamp>How they’d stop you</Stamp>
        <p className={styles.defenseSub}>
          Every move you pulled, and the one line of code that would have shut it.
        </p>
      </div>

      <ol className={styles.defenseList}>
        {gameCase.objectives.map((objective, index) => (
          <ObjectiveDefense key={objective.id} objective={objective} index={index} />
        ))}
      </ol>

      <div className={styles.closedActions}>
        <button type="button" className="btn btn--ghost" onClick={onReplay}>
          <span>Play this case again</span>
        </button>
        <Link href={localeHref('/cases', locale)} className="btn btn--success">
          <span>Back to the board</span>
          <IconArrowRight size={18} />
        </Link>
      </div>
    </section>
  )
}

function ObjectiveDefense({ objective, index }: { objective: Objective; index: number }) {
  // The canonical winning move for this objective (not the player's — the debrief is
  // reachable on any revisit), composed through the frozen composer for the live preview.
  const composed = useMemo(
    () => compose(objective.query.template, objective.expectedSolution.inputs),
    [objective.query.template, objective.expectedSolution.inputs],
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
        <Stamp>Objective {index + 1}</Stamp>
        <span className={cx('mono', styles.defenseBadge)}>{techniqueLabel(objective.technique)}</span>
      </div>
      <h3 className={styles.defenseGoal}>{objective.goal}</h3>

      <p className={styles.moveLabel}>The move</p>
      <SqlPreview segments={composed.segments} />

      <p className={cx('prose', styles.explanation)}>{objective.debrief.explanation}</p>

      <CodeCompare vulnerableGroups={vulnerableGroups} secureGroups={secureGroups} />

      <p className={styles.takeaway}>
        <IconCheck size={18} />
        <span>{objective.debrief.takeaway}</span>
      </p>
    </li>
  )
}
