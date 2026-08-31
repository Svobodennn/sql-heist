import type { Metadata } from 'next'
import type { Locale } from '@/i18n/config'
import { getServerTranslator } from '@/i18n/server'
import { HelpBody } from '@/app/(en)/help/HelpBody'
import { pageMeta } from '@/app/localeMeta'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const activeLocale = locale as Locale
  const t = getServerTranslator(activeLocale)
  return pageMeta('/help', activeLocale, {
    title: t('help.title'),
    description: t('help.lead'),
  })
}

export default async function LocaleHelp({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <HelpBody locale={locale as Locale} />
}
