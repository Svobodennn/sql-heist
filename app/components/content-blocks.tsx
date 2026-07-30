import type { ReactNode } from 'react'
import { cx } from './cx'
import styles from './content.module.css'

// Presentational building blocks for the static content routes. Server
// Components (no client JS) sharing content.module.css with ContentPage, so the
// help/legal pages compose consistent structure instead of hand-rolling markup.

// Plain headed section (Help, FAQ footer, Contact intros). An optional `id`
// makes the section a deep-link/jump-nav target (see TableOfContents).
export function Section({
  id,
  title,
  children,
}: {
  id?: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className={styles.section}>
      <h2>{title}</h2>
      {children}
    </section>
  )
}

// Sticky "On this page" jump-nav that fills the freed right column on the long
// content routes (Help + the legal pages). Pure anchors — no scroll-spy JS, so
// it stays a zero-JS Server Component and static-export safe. Hidden below the
// two-column breakpoint (every target is still reachable by scrolling).
export function TableOfContents({ items }: { items: { href: string; label: string }[] }) {
  return (
    <aside className={cx(styles.rail, styles.railToc)}>
      <nav aria-label="On this page">
        <p className={styles.tocTitle}>On this page</p>
        <ol className={styles.tocList}>
          {items.map((item) => (
            <li key={item.href}>
              <a className={styles.tocLink} href={item.href}>
                {item.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </aside>
  )
}

// Brass left-accent panel — a "short version" / safety note that reads apart
// from the prose without a heading in the document outline.
export function Callout({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <aside className={styles.callout}>
      {label && <span className={styles.calloutLabel}>{label}</span>}
      {children}
    </aside>
  )
}

// Legal section: CSS-counter number (01, 02, …), an anchor id for deep links,
// and a hover/focus-revealed "#" so a clause can be linked directly.
export function LegalSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className={styles.legalSection}>
      <h2 className={styles.legalH2}>
        <span className={styles.legalNum} aria-hidden="true" />
        <span>{title}</span>
        <a className={styles.anchor} href={`#${id}`} aria-label={`Link to the “${title}” section`}>
          #
        </a>
      </h2>
      {children}
    </section>
  )
}
