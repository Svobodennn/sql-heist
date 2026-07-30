'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from './Logo'
import styles from './Footer.module.css'

const COLUMNS = [
  {
    heading: 'Pull a job',
    links: [
      { href: '/', label: 'Home' },
      { href: '/jobs', label: 'The board' },
    ],
  },
  {
    heading: 'Learn the trade',
    links: [
      { href: '/help', label: 'How it works' },
      { href: '/faq', label: 'FAQ' },
    ],
  },
  {
    heading: 'The fine print',
    links: [
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
      { href: '/contact', label: 'Contact' },
    ],
  },
] as const

// Sitewide footer / page inventory. Suppressed on the in-game route
// (/jobs/<id>) so the job screen stays a focused, full-height surface — the
// board (/jobs) and every other route keep it.
export function Footer() {
  const pathname = usePathname()
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
            <p className={styles.tag}>
              The database is real. The crime isn&apos;t. Learn the break-in, then learn the lock.
            </p>
          </div>

          <nav className={styles.cols} aria-label="Footer">
            {COLUMNS.map((col) => (
              <div key={col.heading} className={styles.col}>
                <h2 className={styles.colHeading}>{col.heading}</h2>
                <ul>
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className={styles.link}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className={styles.bottom}>
          <span>&copy; {new Date().getFullYear()} SQL Heist</span>
          <span className={styles.note}>Runs entirely in your browser. No server, no net.</span>
          <a
            className={styles.alsoTry}
            href="https://www.sqlnoir.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            also try <strong>SQL&nbsp;Noir</strong> ↗
          </a>
        </div>
      </div>
    </footer>
  )
}
