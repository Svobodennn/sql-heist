'use client'

import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import type { ToastItem } from '../lib/useToasts'
import { cx } from '../lib/cx'
import { useTranslation } from '@/app/i18n/useTranslation'
import { IconAlert, IconCheck, IconTarget } from './icons'
import styles from './Toast.module.css'

const ICON = {
  info: IconTarget,
  success: IconCheck,
  error: IconAlert,
} as const

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[]
  onDismiss: (id: number) => void
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()

  // No aria-live on the container: each toast is its OWN live region (role
  // alert = assertive for errors, status = polite otherwise). A live region
  // nested in another live region double-announces (§11), so the stack is a
  // plain positioned container.
  return (
    <div className={styles.stack}>
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = ICON[toast.kind]
          return (
            <m.div
              key={toast.id}
              initial={{ opacity: 0, y: reduce ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : 8 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className={cx(styles.toast, styles[toast.kind])}
              role={toast.kind === 'error' ? 'alert' : 'status'}
            >
              <Icon size={16} />
              <span className={styles.msg}>{toast.message}</span>
              <button
                type="button"
                className={styles.close}
                aria-label={t('game.toast.dismiss')}
                onClick={() => onDismiss(toast.id)}
              >
                ×
              </button>
            </m.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
