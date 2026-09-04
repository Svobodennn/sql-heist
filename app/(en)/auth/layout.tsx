import type { ReactNode } from 'react'
import { cx } from '@/ui/cx'
import styles from './auth-layout.module.css'

// Shared centering shell for the canonical (non-localized) /auth/* pages.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className={cx('container', styles.wrap)}>{children}</div>
}
