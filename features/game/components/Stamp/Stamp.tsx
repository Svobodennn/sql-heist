import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'

// Typewriter-stamped label ("CASE FILE", "THE WIRE", "SECURED") — the noir
// in-world framing (docs/04-frontend-ux.md §1.1).
export function Stamp({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('stamp', className)}>{children}</span>
}
