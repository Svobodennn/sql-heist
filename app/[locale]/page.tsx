import type { Metadata } from 'next'
import type { Locale } from '@/i18n/config'
import { HomeBody } from '../HomeBody'
import { pageAlternates } from '../localeMeta'

// The /tr and /pl landing. Same body as the en root (app/page.tsx); the locale param
// (validated to tr/pl in app/[locale]/layout.tsx) selects the catalog.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { alternates: pageAlternates('', locale as Locale) }
}

export default async function LocaleHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <HomeBody locale={locale as Locale} />
}
