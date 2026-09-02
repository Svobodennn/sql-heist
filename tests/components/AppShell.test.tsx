import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from '@/app/shell'

const { brandFont, displayFont, sansFont, monoFont } = vi.hoisted(() => ({
  brandFont: vi.fn(() => ({ variable: 'font-brand' })),
  displayFont: vi.fn(() => ({ variable: 'font-display' })),
  sansFont: vi.fn(() => ({ variable: 'font-sans' })),
  monoFont: vi.fn(() => ({ variable: 'font-mono' })),
}))

vi.mock('next/font/google', () => ({
  Anton: brandFont,
  Space_Grotesk: displayFont,
  Geist: sansFont,
  Geist_Mono: monoFont,
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

  it('defers the below-fold display face while preloading above-fold fonts', () => {
    expect(displayFont).toHaveBeenCalledWith(expect.objectContaining({ preload: false }))
    expect(brandFont).toHaveBeenCalledWith(expect.not.objectContaining({ preload: false }))
    expect(sansFont).toHaveBeenCalledWith(expect.not.objectContaining({ preload: false }))
    expect(monoFont).toHaveBeenCalledWith(expect.not.objectContaining({ preload: false }))
  })
})
