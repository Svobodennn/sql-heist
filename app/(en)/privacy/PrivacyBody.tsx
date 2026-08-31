import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { ContentPage } from '@/app/components/ContentPage'
import { Callout, LegalSection } from '@/app/components/ContentPage/content-blocks'
import { getServerTranslator } from '@/i18n/server'
import { localeHref } from '@/i18n/localeHref'

// Privacy body (Server Component, no client JS). Shared by the unprefixed en
// route and the statically exported /tr + /pl routes; the `locale` prop selects
// the catalog. Clause titles and prose live under `privacy.sections`;
// the numbered clause ids stay in code as stable, non-localized deep-link anchors.
const SECTION_IDS = [
  'controller',
  'data-we-process',
  'local-and-synced-progress',
  'purposes-and-legal-bases',
  'public-profile-and-leaderboard',
  'processors-and-transfers',
  'retention-and-deletion',
  'your-rights',
  'storage-and-security',
  'children-and-changes',
] as const

const DOUBLE_BODY_SECTION_IDS = new Set<string>([
  'data-we-process',
  'purposes-and-legal-bases',
  'processors-and-transfers',
  'retention-and-deletion',
  'your-rights',
])

export function PrivacyBody({ locale }: { locale: Locale }) {
  const t = getServerTranslator(locale)
  return (
    <ContentPage
      eyebrow={t('privacy.eyebrow')}
      title={t('privacy.title')}
      updated="2026-08-26"
      locale={locale}
      lead={t('privacy.lead')}
    >
      <Callout label={t('privacy.glanceLabel')}>
        <p>{t('privacy.glanceBody')}</p>
      </Callout>

      {SECTION_IDS.map((id, i) => (
        <LegalSection key={id} id={id} title={t(`privacy.sections.${i}.title`)}>
          {id === 'children-and-changes' ? (
            <p>
              {t(`privacy.sections.${i}.body`)}
              <Link href={localeHref('/contact', locale)}>{t(`privacy.sections.${i}.link`)}</Link>.
            </p>
          ) : DOUBLE_BODY_SECTION_IDS.has(id) ? (
            <>
              <p>{t(`privacy.sections.${i}.body`)}</p>
              <p>{t(`privacy.sections.${i}.body2`)}</p>
            </>
          ) : (
            <p>{t(`privacy.sections.${i}.body`)}</p>
          )}
        </LegalSection>
      ))}
    </ContentPage>
  )
}
