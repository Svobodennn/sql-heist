import { Anton, Geist, Geist_Mono, Space_Grotesk } from 'next/font/google'

// Inter is deliberately excluded. These self-hosted families preserve literal
// SQL glyphs while keeping the cinematic display and body roles separate.
const brand = Anton({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-brand-src',
})

const display = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
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

export const fontVariables = `${brand.variable} ${display.variable} ${sans.variable} ${mono.variable}`
