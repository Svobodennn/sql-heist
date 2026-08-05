import type { Metadata } from 'next'
import type { Locale } from '@/i18n/config'
import { getServerTranslator } from '@/i18n/server'
import { PrivacyBody } from '../../privacy/PrivacyBody'
import { pageAlternates } from '../../localeMeta'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = getServerTranslator(locale as Locale)
  return { title: t('privacy.title'), alternates: pageAlternates('/privacy', locale as Locale) }
}

export default async function LocalePrivacy({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <PrivacyBody locale={locale as Locale} />
}
