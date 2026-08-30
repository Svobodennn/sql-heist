'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { cx } from '@/ui/cx'
import { Logo } from '../Logo'
import {
  IconMenu,
  IconClose,
  IconUser,
  IconHome,
  IconBoard,
  IconTrophy,
  IconHelpCircle,
  IconArrowRight,
} from '../icons'
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
  { href: '/leaderboard', key: 'nav.leaderboard', Icon: IconTrophy },
  { href: '/help', key: 'nav.help', Icon: IconHelpCircle },
] as const

const FOCUSABLE =
  'a[href], button:not([disabled]), select:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Auth entry point (desktop + mobile). Env-less builds ('disabled') render nothing;
// 'loading' renders like 'anon' — that IS what the prerendered HTML contains, so
// hydration never mismatches. Interactive auth pages have localized static variants;
// the email callback remains canonical inside localeHref.
function AuthEntry() {
  const { status } = useAuth()
  const { locale, t } = useTranslation()
  if (status === 'disabled') return null
  if (status === 'authed') return <UserMenu />
  return (
    <Link href={localeHref('/auth/sign-in', locale)} className={styles.signin}>
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
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // The mobile command sheet is modal: lock background scroll, move focus inside,
  // trap Tab, close on Escape, then restore the opener. The desktop navbar remains
  // untouched because this effect exists only while the mobile sheet is open.
  useEffect(() => {
    if (!open) return
    const opener = toggleRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>('[data-nav-close]')?.focus()
    })

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => !element.hasAttribute('disabled'))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      if (opener?.isConnected) opener.focus()
    }
  }, [open])

  // isActive compares against LOCALE-RESOLVED hrefs (e.g. /tr/help on the tr site).
  const home = localeHref('/', locale)
  const isActive = (href: string) =>
    href === home ? pathname === home : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className={cx(styles.header, open && styles.headerOpen)}>
      <nav
        className={cx('container', styles.nav)}
        aria-label={t('nav.primaryAria')}
        aria-hidden={open || undefined}
      >
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
          <span className={styles.systemStatus} aria-label="System online">
            SYSTEM: ONLINE
          </span>
          <ShareButton />
          <LanguageSwitcher />
          <AuthEntry />
        </div>

        <button
          ref={toggleRef}
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

      <div
        id="nav-mobile"
        className={cx(styles.mobileOverlay, open && styles.mobileOpen)}
        aria-hidden={!open}
      >
        <button
          type="button"
          tabIndex={-1}
          className={styles.mobileBackdrop}
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />

        <section
          ref={panelRef}
          className={styles.mobilePanel}
          role="dialog"
          aria-modal="true"
          aria-label={t('nav.primaryAria')}
        >
          <header className={styles.mobileHeader}>
            <Link
              href={home}
              className={styles.mobileBrand}
              aria-label={t('nav.brandAria')}
              onClick={() => setOpen(false)}
            >
              <Logo size={30} />
              <span>
                <strong>SQL HEIST</strong>
                <small>{'// NAVIGATION'}</small>
              </span>
            </Link>
            <button
              type="button"
              className={styles.mobileClose}
              data-nav-close
              aria-label={t('nav.closeMenu')}
              onClick={() => setOpen(false)}
            >
              <IconClose size={24} />
            </button>
          </header>

          <ul className={styles.mobileLinks}>
            {NAV_LINKS.map((link, index) => {
              const href = localeHref(link.href, locale)
              const active = isActive(href)
              return (
                <li key={link.href}>
                  <Link
                    href={href}
                    className={cx(styles.mobileLink, active && styles.mobileLinkActive)}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                  >
                    <span className={styles.mobileIndex} aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <link.Icon size={20} />
                    <span className={styles.mobileLabel}>{t(link.key)}</span>
                    <IconArrowRight size={17} className={styles.mobileArrow} />
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className={styles.mobileUtilities}>
            <span className={styles.mobileSystem} aria-label="System online">
              SYSTEM: ONLINE
              <i aria-hidden="true" />
            </span>
            <div className={styles.utilityGrid}>
              <ShareButton compact className={styles.utilityControl} />
              <LanguageSwitcher className={styles.utilityControl} />
            </div>
            <div className={styles.mobileAuth}>
              <AuthEntry />
            </div>
          </div>

          <p className={styles.mobileFooter} aria-hidden="true">
            SECURE CHANNEL / SQL HEIST
          </p>
        </section>
      </div>
    </header>
  )
}
