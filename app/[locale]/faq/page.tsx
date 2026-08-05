import type { Metadata } from 'next'
import type { Locale } from '@/i18n/config'
import { getServerTranslator } from '@/i18n/server'
import { FaqBody } from '../../faq/FaqBody'
import { pageAlternates } from '../../localeMeta'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = getServerTranslator(locale as Locale)
  return { title: t('faq.title'), alternates: pageAlternates('/faq', locale as Locale) }
}

export default async function LocaleFaq({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <FaqBody locale={locale as Locale} />
}
