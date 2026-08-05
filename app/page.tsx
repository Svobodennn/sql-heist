import type { Metadata } from 'next'
import { HomeBody } from './HomeBody'
import { pageAlternates } from './localeMeta'

// Landing at the unprefixed root (the default/en URL — SEO canonical stays `/`).
// The /tr and /pl variants live at app/[locale]/page.tsx; both render HomeBody,
// which selects its catalog from the locale prop.
export const metadata: Metadata = {
  alternates: pageAlternates('', 'en'),
}

export default function HomePage() {
  return <HomeBody locale="en" />
}
