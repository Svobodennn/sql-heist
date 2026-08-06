import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { ContentPage } from '@/app/components/ContentPage'
import { Callout, LegalSection } from '@/app/components/ContentPage/content-blocks'
import { getServerTranslator } from '@/i18n/server'
import { localeHref } from '@/i18n/localeHref'

// Terms body (Server Component, no client JS). Shared by the unprefixed en route
// (app/terms/page.tsx) and a future per-locale export; the `locale` prop selects
// the catalog. Clause titles and prose live under `terms.sections`; the numbered
// clause ids stay in code as stable, non-localized deep-link anchors.
const SECTION_IDS = [
  'the-deal',
  'acceptable-use',
  'no-warranty',
  'liability',
  'content',
  'changes',
] as const

export function TermsBody({ locale }: { locale: Locale }) {
  const t = getServerTranslator(locale)
  return (
    <ContentPage
      eyebrow={t('terms.eyebrow')}
      title={t('terms.title')}
      updated="2026-07-30"
      locale={locale}
      lead={t('terms.lead')}
    >
      <Callout label={t('terms.shortLabel')}>
        <p>{t('terms.shortBody')}</p>
      </Callout>

      {SECTION_IDS.map((id, i) => (
        <LegalSection key={id} id={id} title={t(`terms.sections.${i}.title`)}>
          {id === 'acceptable-use' ? (
            <>
              <p>{t(`terms.sections.${i}.body`)}</p>
              <p>{t(`terms.sections.${i}.body2`)}</p>
            </>
          ) : id === 'changes' ? (
            <p>
              {t(`terms.sections.${i}.body`)}
              <Link href={localeHref('/contact', locale)}>{t(`terms.sections.${i}.link`)}</Link>.
            </p>
          ) : (
            <p>{t(`terms.sections.${i}.body`)}</p>
          )}
        </LegalSection>
      ))}
    </ContentPage>
  )
}
