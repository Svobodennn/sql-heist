import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Geist, Geist_Mono, Space_Grotesk } from 'next/font/google'
import './globals.css'

// Fonts (docs/04-frontend-ux.md §1.4). Inter is BANNED. Space Grotesk = display,
// Geist Sans = body, Geist Mono = code surface (ligatures switched OFF in CSS so
// `--`, `<>`, `!=` stay literal — critical for the injection lesson). next/font
// self-hosts these at build time, so the static export ships no runtime font CDN.
const display = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display-src',
})
const sans = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans-src',
})
const mono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono-src',
})

export const metadata: Metadata = {
  title: 'SQL Heist — Learn SQL Injection by Pulling It Off',
  description:
    'A noir heist game that teaches SQL injection against a real in-browser SQLite engine — then teaches you to defend it. Three jobs. No setup.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
