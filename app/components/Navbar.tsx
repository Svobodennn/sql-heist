'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cx } from './cx'
import { Logo } from './Logo'
import { IconMenu, IconClose, IconUser } from './icons'
import { ShareButton } from './ShareButton'
import { LanguageSwitcher } from './LanguageSwitcher'
import styles from './Navbar.module.css'

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/help', label: 'Help' },
] as const

// Site chrome. Rendered once from app/layout.tsx so it wraps every route. It is
// intentionally NOT sticky: the in-game <TopBar> is sticky at top:0 (z-dropdown),
// and two top:0 sticky bars in the same scroll container would overlap. A static
// nav scrolls away on the job screen and lets the game's own bar pin — zero
// changes to the game shell (that in-game chrome is a separate track).
export function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Escape closes the mobile menu.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className={styles.header}>
      <nav className={cx('container', styles.nav)} aria-label="Primary">
        <Link href="/" className={styles.brand} aria-label="SQL Heist — home">
          <Logo size={26} />
          <span>SQL&nbsp;HEIST</span>
        </Link>

        <ul className={styles.links}>
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cx(styles.link, isActive(link.href) && styles.linkActive)}
                aria-current={isActive(link.href) ? 'page' : undefined}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          <ShareButton />
          <LanguageSwitcher />
          {/* Stubbed auth entry point — accounts land in WS5. */}
          <a href="#wip" className={styles.signin} title="Accounts are coming soon">
            <IconUser size={18} />
            <span>Sign in</span>
          </a>
        </div>

        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls="nav-mobile"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <IconClose size={22} /> : <IconMenu size={22} />}
        </button>
      </nav>

      {/* Mobile panel: same destinations + controls, revealed by the toggle. */}
      <div id="nav-mobile" className={cx(styles.mobile, open && styles.mobileOpen)} hidden={!open}>
        <ul className={styles.mobileLinks}>
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cx(styles.mobileLink, isActive(link.href) && styles.linkActive)}
                aria-current={isActive(link.href) ? 'page' : undefined}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className={styles.mobileActions}>
          <ShareButton compact />
          <LanguageSwitcher />
          <a href="#wip" className={styles.signin} title="Accounts are coming soon">
            <IconUser size={18} />
            <span>Sign in</span>
          </a>
        </div>
      </div>
    </header>
  )
}
