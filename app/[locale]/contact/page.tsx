import type { Metadata } from 'next'
import type { Locale } from '@/i18n/config'
import { getServerTranslator } from '@/i18n/server'
import { ContactBody } from '../../contact/ContactBody'
import { pageAlternates } from '../../localeMeta'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = getServerTranslator(locale as Locale)
  return { title: t('contact.title'), alternates: pageAlternates('/contact', locale as Locale) }
}

export default async function LocaleContact({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <ContactBody locale={locale as Locale} />
}
