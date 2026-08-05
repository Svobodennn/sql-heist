import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

// Per-locale static routes (WS4 per-locale export). `en` stays at the unprefixed
// root; this segment statically generates ONLY /tr and /pl at build time. The
// shared page bodies pick their catalog from the `locale` param. No <html>/<body>
// here — the root app/layout.tsx owns those; the client I18nProvider flips
// document.lang from the URL on hydration.
export function generateStaticParams() {
  return [{ locale: 'tr' }, { locale: 'pl' }]
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (locale !== 'tr' && locale !== 'pl') notFound()
  return children
}
