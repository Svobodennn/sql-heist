'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { ToastItem } from '../lib/useToasts'
import { cx } from '../lib/cx'
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
  const reduce = useReducedMotion()

  return (
    <div className={styles.stack} aria-live="polite">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = ICON[toast.kind]
          return (
            <motion.div
              key={toast.id}
              layout
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
                aria-label="Dismiss"
                onClick={() => onDismiss(toast.id)}
              >
                ×
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
