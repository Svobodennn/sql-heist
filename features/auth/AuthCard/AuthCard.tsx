'use client'

import type { ReactNode } from 'react'
import { cx } from '@/ui/cx'
import styles from './AuthCard.module.css'

// Shared frame for every account surface (sign-in/sign-up/callback/gate body):
// a brass-noir dossier panel — stamp line, display title, form body, footer.
export function AuthCard({
  stamp,
  title,
  children,
  footer,
}: {
  stamp?: string
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <section className={cx('panel', styles.card)}>
      <header className={styles.head}>
        {stamp && <p className="stamp">{stamp}</p>}
        <h1 className={styles.title}>{title}</h1>
      </header>
      <div className={styles.body}>{children}</div>
      {footer && <footer className={styles.footer}>{footer}</footer>}
    </section>
  )
}
