import type { Metadata } from 'next'
import type { Locale } from '@/i18n/config'
import { getCaseMetas } from '@/features/game/cases'
import { CaseBoard } from '@/features/game/components/CaseBoard'
import { pageAlternates } from '../../localeMeta'

// The /tr and /pl case board. Same client <CaseBoard>; the metadata (localized case
// titles) is derived server-side from the locale param.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return { title: 'Cases', alternates: pageAlternates('/cases', locale as Locale) }
}

export default async function LocaleCaseBoard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return (
    <CaseBoard cases={getCaseMetas(locale as Locale)} />
  )
}
