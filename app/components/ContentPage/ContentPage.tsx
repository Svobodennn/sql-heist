import type { ReactNode } from 'react'
import type { Locale } from '@/i18n/config'
import { getServerTranslator } from '@/i18n/server'
import { buildBreadcrumbList } from '@/app/structuredData'
import { JsonLd } from '../JsonLd'
import { Logo } from '../Logo'
import styles from './content.module.css'

// Shared shell for the static content routes (Help, FAQ, Privacy, Terms,
// Contact). Server Component — no client JS. A full-bleed noir hero header
// (centred, like the landing hero) sits above ONE centred reading column held
// to a comfortable measure. Prose is left-aligned within that centred column;
// nothing hugs the left edge. Any supplementary content (helper cards, notes)
// lives in `children` so it stacks centred in the normal flow — no side rail.
export function ContentPage({
  eyebrow,
  title,
  lead,
  updated,
  locale = 'en',
  breadcrumbPath,
  children,
}: {
  eyebrow: string
  title: string
  lead?: string
  updated?: string
  // Only the "last updated" label is translated in-component; everything else
  // arrives pre-translated as props. Callers that render `updated` MUST pass their
  // locale or the label falls back to English.
  locale?: Locale
  breadcrumbPath: string
  children: ReactNode
}) {
  const t = getServerTranslator(locale)
  const breadcrumbLd = buildBreadcrumbList(locale, [
    { name: t('nav.home'), path: '/' },
    { name: title, path: breadcrumbPath },
  ])

  return (
    <main className={styles.page}>
      <JsonLd data={breadcrumbLd} />
      <header className={styles.hero}>
        <div className="container">
          <div className={styles.heroInner} data-reveal="left">
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
        <article className={styles.main}>{children}</article>
      </div>
    </main>
  )
}
