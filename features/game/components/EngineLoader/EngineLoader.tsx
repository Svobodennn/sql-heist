'use client'

import { useEffect, useState, type ReactNode } from 'react'
import type { EngineStatus } from '../../lib/engineStatus'
import { useTranslation } from '@/i18n/useTranslation'
import { Button } from '../Button'
import { IconAlert } from '../icons'
import styles from './EngineLoader.module.css'

// WASM boot gate (docs/01-architecture.md §2.1 R3). `error` shows a retry panel
// (graceful degradation); `loading` never blocks — children render and a subtle
// "warming up" note appears only past the 300ms delay (no flash on fast boots).
export function EngineLoader({
  status,
  onRetry,
  children,
}: {
  status: EngineStatus
  onRetry: () => void
  children: ReactNode
}) {
  const { t } = useTranslation()
  const [showLoading, setShowLoading] = useState(false)

  useEffect(() => {
    if (status !== 'loading') {
      setShowLoading(false)
      return
    }
    const t = setTimeout(() => setShowLoading(true), 300)
    return () => clearTimeout(t)
  }, [status])

  if (status === 'error') {
    return (
      <div className={styles.error} role="alert">
        <IconAlert size={20} />
        <p className={styles.errorTitle}>{t('game.engine.dead')}</p>
        <p className={styles.errorBody}>{t('game.engine.deadBody')}</p>
        <Button variant="ghost" onClick={onRetry}>
          {t('game.engine.retry')}
        </Button>
      </div>
    )
  }

  return (
    <>
      {children}
      {status === 'loading' && showLoading && (
        <p className={styles.warming} aria-live="polite">
          <span className={styles.spinner} aria-hidden="true" />
          {t('game.engine.warming')}
        </p>
      )}
    </>
  )
}
