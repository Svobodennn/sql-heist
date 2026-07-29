import type { ReactNode } from 'react'
import styles from './content.module.css'

// Shared shell for the static content routes (Help, FAQ, Privacy, Terms,
// Contact). Server Component — no client JS. Provides the noir page header and a
// readable prose column (max 65ch) so every legal/help page reads consistently.
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
  return (
    <main className={styles.page}>
      <div className="container">
        <header className={styles.head}>
          <span className="stamp">{eyebrow}</span>
          <h1 className={styles.title}>{title}</h1>
          {lead && <p className={styles.lead}>{lead}</p>}
          {updated && (
            <p className={styles.updated}>
              Last updated <time dateTime={updated}>{updated}</time>
            </p>
          )}
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </main>
  )
}
