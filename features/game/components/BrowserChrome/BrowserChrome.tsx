'use client'

import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { IconLock } from '../icons'
import styles from './BrowserChrome.module.css'

// Fake browser frame around the mimic target (docs/04-frontend-ux.md §4). The
// address bar sells realism and, for url-param jobs, teaches that the injection
// point can be the URL itself. Purely chrome — the app lives in `children`.
export function BrowserChrome({
  url,
  children,
  className,
}: {
  url: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cx(styles.frame, className)}>
      <div className={styles.bar}>
        <span className={styles.dots} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className={cx('mono', styles.address)}>
          <IconLock size={13} />
          <span className={styles.url}>{url}</span>
        </span>
      </div>
      <div className={styles.viewport}>{children}</div>
    </div>
  )
}
