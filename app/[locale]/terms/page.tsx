import type { Metadata } from 'next'
import type { Locale } from '@/i18n/config'
import { getServerTranslator } from '@/i18n/server'
import { TermsBody } from '@/app/(en)/terms/TermsBody'
import { pageAlternates } from '@/app/localeMeta'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = getServerTranslator(locale as Locale)
  return { title: t('terms.title'), alternates: pageAlternates('/terms', locale as Locale) }
}

export default async function LocaleTerms({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <TermsBody locale={locale as Locale} />
}
