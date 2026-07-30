'use client'

import { cx } from '@/ui/cx'
import { useTranslation } from '@/i18n/useTranslation'
import { Stamp } from '../Stamp'
import styles from './HandlerCard.module.css'

// The handler speaking the brief (docs/04-frontend-ux.md §3). The silhouette is
// decorative (alt-equivalent: aria-hidden); meaning is carried by the codename +
// speech text. Brief copy is rendered as plain, React-escaped text (no markdown
// HTML — dangerouslySetInnerHTML is banned).
export function HandlerCard({
  handler,
  text,
  className,
}: {
  handler: string
  text: string
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <div className={cx('panel', styles.card, className)}>
      <div className={styles.head}>
        <span className={styles.avatar} aria-hidden="true" />
        <div>
          <Stamp>{t('game.brief.handler')}</Stamp>
          <p className={styles.codename}>{handler}</p>
        </div>
      </div>
      <p className={cx('prose', styles.speech)}>{text}</p>
    </div>
  )
}
