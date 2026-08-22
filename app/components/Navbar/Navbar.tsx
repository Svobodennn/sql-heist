'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cx } from '@/ui/cx'
import { Logo } from '../Logo'
import { IconMenu, IconClose, IconUser, IconHome, IconBoard, IconHelpCircle } from '../icons'
import { ShareButton } from '../ShareButton'
import { LanguageSwitcher } from '../LanguageSwitcher'
import { useTranslation } from '@/i18n/useTranslation'
import { localeHref } from '@/i18n/localeHref'
import { useAuth } from '@/features/auth/useAuth'
import { UserMenu } from '@/features/auth/UserMenu'
import styles from './Navbar.module.css'

// Icons are decorative (aria-hidden in <Base>); the translated text stays the
// accessible label for each destination.
const NAV_LINKS = [
  { href: '/', key: 'nav.home', Icon: IconHome },
  { href: '/cases', key: 'nav.jobs', Icon: IconBoard },
  { href: '/help', key: 'nav.help', Icon: IconHelpCircle },
] as const

// Auth entry point (desktop + mobile). Env-less builds ('disabled') render nothing;
// 'loading' renders like 'anon' — that IS what the prerendered HTML contains, so
// hydration never mismatches. /auth/* stays canonical (non-localized), hence Link
// without localeHref.
function AuthEntry() {
  const { status } = useAuth()
  const { t } = useTranslation()
  if (status === 'disabled') return null
  if (status === 'authed') return <UserMenu />
  return (
    <Link href="/auth/sign-in" className={styles.signin}>
      <IconUser size={18} />
      <span>{t('nav.signIn')}</span>
    </Link>
  )
}

// Site chrome. Rendered once from app/layout.tsx so it wraps every route. Sticky
// at top:0 (see Navbar.module.css); the in-game chrome (case header + objectives
// stepper) is non-sticky, so there is no second top:0 bar to overlap.
export function Navbar() {
  const pathname = usePathname()
  const { t, locale } = useTranslation()
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

  // isActive compares against LOCALE-RESOLVED hrefs (e.g. /tr/help on the tr site).
  const home = localeHref('/', locale)
  const isActive = (href: string) =>
    href === home ? pathname === home : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className={styles.header}>
      <nav className={cx('container', styles.nav)} aria-label={t('nav.primaryAria')}>
        <Link href={home} className={styles.brand} aria-label={t('nav.brandAria')}>
          <Logo size={26} />
          <span>SQL&nbsp;HEIST</span>
        </Link>

        <ul className={styles.links}>
          {NAV_LINKS.map((link) => {
            const href = localeHref(link.href, locale)
            return (
              <li key={link.href}>
                <Link
                  href={href}
                  className={cx(styles.link, isActive(href) && styles.linkActive)}
                  aria-current={isActive(href) ? 'page' : undefined}
                >
                  <link.Icon size={16} />
                  {t(link.key)}
                </Link>
              </li>
            )
          })}
        </ul>

        <div className={styles.actions}>
          <ShareButton />
          <LanguageSwitcher />
          <AuthEntry />
        </div>

        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls="nav-mobile"
          aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <IconClose size={22} /> : <IconMenu size={22} />}
        </button>
      </nav>

      {/* Mobile panel: same destinations + controls, revealed by the toggle. */}
      <div id="nav-mobile" className={cx(styles.mobile, open && styles.mobileOpen)} hidden={!open}>
        <ul className={styles.mobileLinks}>
          {NAV_LINKS.map((link) => {
            const href = localeHref(link.href, locale)
            return (
              <li key={link.href}>
                <Link
                  href={href}
                  className={cx(styles.mobileLink, isActive(href) && styles.linkActive)}
                  aria-current={isActive(href) ? 'page' : undefined}
                >
                  <link.Icon size={18} />
                  {t(link.key)}
                </Link>
              </li>
            )
          })}
        </ul>
        <div className={styles.mobileActions}>
          <ShareButton compact />
          <LanguageSwitcher />
          <AuthEntry />
        </div>
      </div>
    </header>
  )
}
