import type { Metadata } from 'next'
import type { Locale } from '@/i18n/config'
import { getServerTranslator } from '@/i18n/server'
import { ContactBody } from '@/app/(en)/contact/ContactBody'
import { pageMeta } from '@/app/localeMeta'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const activeLocale = locale as Locale
  const t = getServerTranslator(activeLocale)
  return pageMeta('/contact', activeLocale, {
    title: t('contact.title'),
    description: t('contact.lead'),
  })
}

export default async function LocaleContact({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <ContactBody locale={locale as Locale} />
}
