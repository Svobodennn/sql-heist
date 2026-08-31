import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ProfileView } from '@/features/profile'
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
  return pageMeta('/u', activeLocale, {
    title: t('profile.stamp'),
    description: t('profile.emptyBody'),
  })
}

export default function LocalePublicProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfileView />
    </Suspense>
  )
}
