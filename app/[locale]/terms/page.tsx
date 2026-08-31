import type { Metadata } from 'next'
import type { Locale } from '@/i18n/config'
import { getServerTranslator } from '@/i18n/server'
import { TermsBody } from '@/app/(en)/terms/TermsBody'
import { pageMeta } from '@/app/localeMeta'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const activeLocale = locale as Locale
  const t = getServerTranslator(activeLocale)
  return pageMeta('/terms', activeLocale, {
    title: t('terms.title'),
    description: t('terms.lead'),
  })
}

export default async function LocaleTerms({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <TermsBody locale={locale as Locale} />
}
