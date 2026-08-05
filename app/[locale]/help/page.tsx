import type { Metadata } from 'next'
import type { Locale } from '@/i18n/config'
import { getServerTranslator } from '@/i18n/server'
import { HelpBody } from '../../help/HelpBody'
import { pageAlternates } from '../../localeMeta'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = getServerTranslator(locale as Locale)
  return { title: t('help.title'), alternates: pageAlternates('/help', locale as Locale) }
}

export default async function LocaleHelp({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <HelpBody locale={locale as Locale} />
}
