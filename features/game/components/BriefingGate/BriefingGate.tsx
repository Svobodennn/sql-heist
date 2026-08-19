'use client'

import { cx } from '@/ui/cx'
import { useTranslation } from '@/i18n/useTranslation'
import { Button } from '../Button'
import { Stamp } from '../Stamp'
import { IconArrowRight, IconTarget } from '../icons'
import styles from './BriefingGate.module.css'

// The briefing GATE. Entering a case opens on the brief ALONE — the handler's pitch
// and a single "take the case" CTA — then hands the player to the active objective.
// Structural labels come from the i18n catalog; briefing.handler + briefing.text are
// localized case content. The heading carries the phase-swap focus marker.
interface BriefingGateProps {
  briefing: { handler: string; text: string }
  objectiveCount: number
  onStart: () => void
}

export function BriefingGate({ briefing, objectiveCount, onStart }: BriefingGateProps) {
  const { t } = useTranslation()
  return (
    <section className={cx('panel', styles.gate)} aria-label="Case briefing">
      <div className={styles.head}>
        <Stamp>{t('game.case.brief.stamp')}</Stamp>
        <span className={cx('mono', styles.handler)}>{briefing.handler}</span>
      </div>

      <h2 className={styles.heading} data-objective-heading tabIndex={-1}>
        {t('game.case.brief.heading')}
      </h2>

      <p className={cx('prose', styles.text)}>{briefing.text}</p>

      <p className={styles.meta}>
        <IconTarget size={16} />
        <span>{t('game.case.brief.meta', { count: objectiveCount })}</span>
      </p>

      <div className={styles.actions}>
        <Button variant="primary" onClick={onStart} iconRight={<IconArrowRight size={18} />}>
          {t('game.case.brief.take')}
        </Button>
      </div>
    </section>
  )
}
