'use client'

import type { Objective } from '@/lib/schema/case'
import type { RunResult } from '@/lib/engine/sqlRunner'
import type { RunSignal } from '@/lib/engine/signal'
import { cx } from '@/ui/cx'
import { techniqueLabel } from '../../lib/caseView'
import { Button } from '../Button'
import { SignalPanel } from '../SignalPanel'
import { Stamp } from '../Stamp'
import { IconArrowRight, IconCheck, IconLootTag } from '../icons'
import styles from './ObjectivePayoff.module.css'

// The per-objective PAYOFF (docs/cases-design.md — "per-objective loot moments").
// A win no longer silently auto-advances; it lands here first so the score reads as
// a beat: WHAT WAS EXTRACTED (the winning run's rows/loot, via the frozen ResultGrid
// so loot is badged the same way it is live) → the loot headline (payoff.got) → the
// Fixer's chain line (payoff.fixer, "we got X, now we can Y") → a Next button the
// player presses to move on. After the LAST objective, Next hands off to CaseClosed.
// payoff is optional in the schema, so the got/fixer beats degrade gracefully. The
// extraction reuses the FROZEN SignalPanel — the exact readout THE WIRE showed the
// player when they won (rows/loot grid, or the oracle/timing/error/side-effect
// panel) — so the payoff evidence is engine-truth, not a re-derivation.
interface ObjectivePayoffProps {
  index: number // zero-based position of the just-cleared objective
  total: number
  objective: Objective
  result: RunResult | null
  signal: RunSignal | null
  handler: string // the Fixer — voices the chain line
  isLast: boolean
  onNext: () => void
}

export function ObjectivePayoff({
  index,
  total,
  objective,
  result,
  signal,
  handler,
  isLast,
  onNext,
}: ObjectivePayoffProps) {
  const payoff = objective.payoff
  const headline = payoff?.got ?? 'Objective cleared.'

  return (
    <section className={cx('panel', styles.payoff)} aria-label="Objective payoff">
      <div className={styles.head}>
        <Stamp>
          Objective {index + 1}/{total} · secured
        </Stamp>
        <span className={cx('mono', styles.badge)}>{techniqueLabel(objective.technique)}</span>
      </div>

      <h2 className={styles.headline} data-objective-heading tabIndex={-1}>
        <IconLootTag size={22} />
        <span>{headline}</span>
      </h2>

      <div className={styles.extracted}>
        <p className={styles.extractedLabel}>What we pulled</p>
        <SignalPanel signal={signal} result={result} winCondition={objective.winCondition} />
      </div>

      {payoff?.fixer && (
        <p className={styles.fixer}>
          <span className={styles.fixerTag}>{handler}</span>
          {payoff.fixer}
        </p>
      )}

      <div className={styles.actions}>
        <Button
          variant="success"
          onClick={onNext}
          iconRight={isLast ? <IconCheck size={18} /> : <IconArrowRight size={18} />}
        >
          Next
        </Button>
        <span className={styles.nextHint}>
          {isLast ? 'Close the case — see how they’d have stopped you.' : 'On to the next hand.'}
        </span>
      </div>
    </section>
  )
}
