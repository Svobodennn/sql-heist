'use client'

import { useCallback, useRef, useState } from 'react'

// Milestone / error toasts (docs/04-frontend-ux.md §5.4, §13). Info + success
// auto-dismiss (~4s); errors stay until replaced. Managed outside the phase
// reducer so transient UI noise never touches game state.
export type ToastKind = 'info' | 'success' | 'error'

export interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

const AUTO_DISMISS_MS = 4000

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = (idRef.current += 1)
      setToasts((list) => [...list, { id, kind, message }])
      if (kind !== 'error') {
        setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
      }
      return id
    },
    [dismiss],
  )

  return { toasts, push, dismiss }
}
