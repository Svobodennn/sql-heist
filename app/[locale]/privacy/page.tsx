import type { Metadata } from 'next'
import type { Locale } from '@/i18n/config'
import { getServerTranslator } from '@/i18n/server'
import { PrivacyBody } from '@/app/(en)/privacy/PrivacyBody'
import { pageMeta } from '@/app/localeMeta'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const activeLocale = locale as Locale
  const t = getServerTranslator(activeLocale)
  return pageMeta('/privacy', activeLocale, {
    title: t('privacy.title'),
    description: t('privacy.lead'),
  })
}

export default async function LocalePrivacy({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return <PrivacyBody locale={locale as Locale} />
}
