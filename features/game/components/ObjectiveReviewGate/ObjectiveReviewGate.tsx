'use client'

import type { Objective } from '@/lib/schema/case'
import { useTranslation } from '@/i18n/useTranslation'
import { Button } from '../Button'
import { ObjectiveBanner } from '../ObjectiveBanner'
import { Stamp } from '../Stamp'
import { IconArrowRight } from '../icons'
import styles from './ObjectiveReviewGate.module.css'

interface ObjectiveReviewGateProps {
  index: number
  total: number
  objective: Objective
  onEnter: () => void
}

// A deliberate pause between accepting a case and touching the target. It reuses
// the same ObjectiveBanner rendered during play, guaranteeing that review and live
// operation describe one source of truth rather than two independently maintained
// summaries.
export function ObjectiveReviewGate({
  index,
  total,
  objective,
  onEnter,
}: ObjectiveReviewGateProps) {
  const { t } = useTranslation()

  return (
    <section className={styles.gate} aria-label={t('game.case.review.aria')}>
      <div className={styles.phase}>
        <Stamp>{t('game.case.review.stamp')}</Stamp>
        <p>{t('game.case.review.instruction')}</p>
      </div>

      <ObjectiveBanner
        index={index}
        total={total}
        goal={objective.goal}
        why={objective.why}
        doneWhen={objective.doneWhen}
        approach={objective.approach}
        technique={objective.technique}
      />

      <div className={styles.actions}>
        <Button variant="primary" onClick={onEnter} iconRight={<IconArrowRight size={18} />}>
          {t('game.case.review.enter')}
        </Button>
      </div>
    </section>
  )
}
