import type { ReactNode } from 'react'
import { getServerTranslator } from '@/app/i18n/server'
import { Logo } from './Logo'
import styles from './content.module.css'

// Shared shell for the static content routes (Help, FAQ, Privacy, Terms,
// Contact). Server Component — no client JS. Full-bleed noir hero header + a
// reading column held to a comfortable measure. Hero and column share one 60rem
// measure (centred in the wide shell) so nothing hugs the left edge; on wide
// viewports the freed right column carries an optional `aside` rail (a jump-nav
// for the long docs, helper cards elsewhere).
export function ContentPage({
  eyebrow,
  title,
  lead,
  updated,
  aside,
  children,
}: {
  eyebrow: string
  title: string
  lead?: string
  updated?: string
  aside?: ReactNode
  children: ReactNode
}) {
  const t = getServerTranslator()
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className="container">
          <div className={styles.heroInner}>
            <Logo size={30} className={styles.heroMark} />
            <span className="stamp">{eyebrow}</span>
            <h1 className={styles.title}>{title}</h1>
            {lead && <p className={styles.lead}>{lead}</p>}
            {updated && (
              <p className={styles.updated}>
                {t('content.updated')} <time dateTime={updated}>{updated}</time>
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="container">
        <div className={styles.layout}>
          <div className={styles.main}>{children}</div>
          {aside}
        </div>
      </div>
    </main>
  )
}
