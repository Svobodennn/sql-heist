'use client'

import type { FilterOutcome } from '@/lib/engine/queryComposer'
import { filterBanner } from '../lib/signalView'
import { cx } from '../lib/cx'
import { useTranslation } from '@/app/i18n/useTranslation'
import { IconBlock, IconScissors } from './icons'
import styles from './WafBanner.module.css'

// WAF FilterOutcome overlay (docs/ws3-design.md "WAF feedback = both"): what the
// input filter DID to the raw payload on the last run, surfaced by
// levelSession.run().filter. reject => a hard crimson "blocked" stop naming the
// terms; strip => a steel "cleaned" note showing the neutered input. It is
// ORTHOGONAL to the signal panel (a waf-bypass level still renders rows/etc.), so
// it rides above the readout as its own banner. The effectiveInput is RAW player
// text — rendered as an escaped text node (K7/XSS), never as markup.
export function WafBanner({ filter }: { filter: FilterOutcome }) {
  const { t } = useTranslation()
  const v = filterBanner(filter)
  const isReject = v.mode === 'reject'
  return (
    <div
      className={cx(styles.banner, isReject ? styles.reject : styles.strip)}
      role="status"
      aria-label={v.ariaLabel}
    >
      <span className={styles.icon} aria-hidden="true">
        {isReject ? <IconBlock size={16} /> : <IconScissors size={16} />}
      </span>
      {isReject ? (
        <p className={styles.text} aria-hidden="true">
          <span className={styles.label}>{t('game.waf.blocked')}</span>{' '}
          <span className="mono">{v.terms.length > 0 ? v.terms.join(', ') : '—'}</span>
        </p>
      ) : (
        <p className={styles.text} aria-hidden="true">
          <span className={styles.label}>{t('game.waf.cleaned')}</span> {t('game.waf.became')}{' '}
          {v.effectiveInput.length > 0 ? (
            <span className={cx('mono', styles.became)}>{v.effectiveInput}</span>
          ) : (
            <span className={styles.empty}>{t('game.waf.empty')}</span>
          )}
        </p>
      )}
    </div>
  )
}
