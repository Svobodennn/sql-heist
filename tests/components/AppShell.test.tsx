import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from '@/app/shell'

vi.mock('next/font/google', () => ({
  Anton: () => ({ variable: 'font-brand' }),
  Space_Grotesk: () => ({ variable: 'font-display' }),
  Geist: () => ({ variable: 'font-sans' }),
  Geist_Mono: () => ({ variable: 'font-mono' }),
}))

vi.mock('@/i18n/I18nProvider', () => ({
  I18nProvider: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('@/features/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('@/features/auth/UsernameGate', () => ({ UsernameGate: () => null }))
vi.mock('@/app/components/CinematicCursor', () => ({ CinematicCursor: () => null }))
vi.mock('@/app/components/CookieConsent', () => ({ CookieConsent: () => null }))
vi.mock('@/app/components/Footer', () => ({ Footer: () => <footer>Footer</footer> }))
vi.mock('@/app/components/Navbar', () => ({ Navbar: () => <nav>Navbar</nav> }))

describe('<AppShell>', () => {
  it('owns the locale root and renders route content inside the shared chrome', () => {
    const markup = renderToStaticMarkup(
      <AppShell locale="tr">
        <article>Case files</article>
      </AppShell>,
    )

    expect(markup).toContain('<html lang="tr" class="font-brand font-display font-sans font-mono">')
    expect(markup).toContain('id="main-content" tabindex="-1"')
    expect(markup).toContain('<article>Case files</article>')
  })
})
