'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from './Logo'
import { useTranslation } from '@/i18n/useTranslation'
import styles from './Footer.module.css'

const COLUMNS = [
  {
    headingKey: 'footer.colPull',
    links: [
      { href: '/', key: 'footer.linkHome' },
      { href: '/jobs', key: 'footer.linkBoard' },
    ],
  },
  {
    headingKey: 'footer.colLearn',
    links: [
      { href: '/help', key: 'footer.linkHelp' },
      { href: '/faq', key: 'footer.linkFaq' },
    ],
  },
  {
    headingKey: 'footer.colFine',
    links: [
      { href: '/privacy', key: 'footer.linkPrivacy' },
      { href: '/terms', key: 'footer.linkTerms' },
      { href: '/contact', key: 'footer.linkContact' },
    ],
  },
] as const

// Sitewide footer / page inventory. Suppressed on the in-game route
// (/jobs/<id>) so the job screen stays a focused, full-height surface — the
// board (/jobs) and every other route keep it.
export function Footer() {
  const pathname = usePathname()
  const { t } = useTranslation()
  if (/^\/jobs\/[^/]+/.test(pathname)) return null

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.top}>
          <div className={styles.brandCol}>
            <span className={styles.brand}>
              <Logo size={20} />
              SQL&nbsp;HEIST
            </span>
            <p className={styles.tag}>{t('footer.tagline')}</p>
          </div>

          <nav className={styles.cols} aria-label={t('footer.aria')}>
            {COLUMNS.map((col) => (
              <div key={col.headingKey} className={styles.col}>
                <h2 className={styles.colHeading}>{t(col.headingKey)}</h2>
                <ul>
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className={styles.link}>
                        {t(link.key)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className={styles.bottom}>
          <span>{t('footer.copyright', { year: new Date().getFullYear() })}</span>
          <span className={styles.note}>{t('footer.note')}</span>
          <a
            className={styles.alsoTry}
            href="https://www.sqlnoir.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('footer.alsoTry')} <strong>SQL&nbsp;Noir</strong> ↗
          </a>
        </div>
      </div>
    </footer>
  )
}
