import type { Metadata } from 'next'
import { AccountPanel } from '@/features/profile'
import type { Locale } from '@/i18n/config'
import { getServerTranslator } from '@/i18n/server'
import { pageMeta } from '../../localeMeta'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const activeLocale = locale as Locale
  const t = getServerTranslator(activeLocale)
  return {
    ...pageMeta('/account', activeLocale, {
      title: t('account.title'),
      description: t('account.lede'),
    }),
    robots: { index: false, follow: true },
  }
}

export default function LocaleAccountPage() {
  return <AccountPanel />
}
