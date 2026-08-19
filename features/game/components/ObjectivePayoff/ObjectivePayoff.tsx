'use client'

import type { Objective } from '@/lib/schema/case'
import type { RunResult } from '@/lib/engine/sqlRunner'
import type { RunSignal } from '@/lib/engine/signal'
import { cx } from '@/ui/cx'
import { useTranslation } from '@/i18n/useTranslation'
import { Button } from '../Button'
import { SignalPanel } from '../SignalPanel'
import { Stamp } from '../Stamp'
import { IconArrowRight, IconCheck, IconLootTag } from '../icons'
import styles from './ObjectivePayoff.module.css'

// The per-objective PAYOFF (docs/cases-design.md — "per-objective loot moments").
// A win lands here first: WHAT WAS EXTRACTED (the winning run, via the frozen
// SignalPanel) → the loot headline (payoff.got) → the handler's chain line → a Next
// button. After the LAST objective, Next hands off to CaseClosed. Structural labels
// come from the i18n catalog; the got/fixer VALUES are localized case content.
interface ObjectivePayoffProps {
  index: number // zero-based position of the just-cleared objective
  total: number
  objective: Objective
  result: RunResult | null
  signal: RunSignal | null
  handler: string // the handler — voices the chain line
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
  const { t } = useTranslation()
  const payoff = objective.payoff
  const headline = payoff?.got ?? t('game.case.payoff.fallback')

  return (
    <section className={cx('panel', styles.payoff)} aria-label="Objective payoff">
      <div className={styles.head}>
        <Stamp>{t('game.case.payoff.secured', { index: index + 1, total })}</Stamp>
        <span className={cx('mono', styles.badge)}>{t(`game.technique.${objective.technique}`)}</span>
      </div>

      <h2 className={styles.headline} data-objective-heading tabIndex={-1}>
        <IconLootTag size={22} />
        <span>{headline}</span>
      </h2>

      <div className={styles.extracted}>
        <p className={styles.extractedLabel}>{t('game.case.payoff.extracted')}</p>
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
          {t('game.case.payoff.next')}
        </Button>
        <span className={styles.nextHint}>
          {isLast ? t('game.case.payoff.hintLast') : t('game.case.payoff.hintNext')}
        </span>
      </div>
    </section>
  )
}
