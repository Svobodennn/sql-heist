import type { Metadata } from 'next'
import type { Locale } from '@/i18n/config'
import { getServerTranslator } from '@/i18n/server'
import { FaqBody } from '@/app/(en)/faq/FaqBody'
import { pageMeta } from '@/app/localeMeta'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const activeLocale = locale as Locale
  const t = getServerTranslator(activeLocale)
  return pageMeta('/faq', activeLocale, {
    title: t('faq.title'),
    description: t('faq.lead'),
  })
}

export default async function LocaleFaq({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <FaqBody locale={locale as Locale} />
}
