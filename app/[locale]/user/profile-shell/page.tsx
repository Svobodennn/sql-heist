import type { Metadata } from 'next'
import { PublicProfileRoute } from '@/app/components/PublicProfileRoute'
import { publicProfileShellMetadata } from '@/app/publicProfileShellMeta'
import type { Locale } from '@/i18n/config'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return publicProfileShellMetadata(locale as Locale)
}

export default function LocalePublicProfileShellPage() {
  return <PublicProfileRoute />
}
