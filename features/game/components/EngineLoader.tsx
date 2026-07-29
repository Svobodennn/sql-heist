'use client'

import { useEffect, useState, type ReactNode } from 'react'
import type { EngineStatus } from '../lib/useEngine'
import { Button } from './Button'
import { IconAlert } from './icons'
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
        <p className={styles.errorTitle}>The gear jammed</p>
        <p className={styles.errorBody}>
          The SQLite engine failed to load. Check your connection and try again.
        </p>
        <Button variant="ghost" onClick={onRetry}>
          Retry
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
          Prepping the gear…
        </p>
      )}
    </>
  )
}
