import type { ReactNode } from 'react'
import { getServerTranslator } from '@/app/i18n/server'
import styles from './content.module.css'

// Shared shell for the static content routes (Help, FAQ, Privacy, Terms,
// Contact). Server Component — no client JS. Full-bleed noir hero header + a
// single readable measure column (~68ch) so every help/legal page reads like a
// real product page instead of a wall of text.
export function ContentPage({
  eyebrow,
  title,
  lead,
  updated,
  children,
}: {
  eyebrow: string
  title: string
  lead?: string
  updated?: string
  children: ReactNode
}) {
  const t = getServerTranslator()
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className="container">
          <div className={styles.heroInner}>
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
        <div className={styles.body}>{children}</div>
      </div>
    </main>
  )
}
