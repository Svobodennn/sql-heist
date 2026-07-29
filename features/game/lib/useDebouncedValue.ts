'use client'

import { useEffect, useState } from 'react'

// Trailing-edge debounce for a reactive value. Used to feed screen-reader live
// regions from fast-changing state (e.g. the composed SQL on every keystroke)
// so assistive tech announces the settled value once, not per character
// (docs/04-frontend-ux.md §11 — avoid live-region spam / double-speak).
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])

  return debounced
}
