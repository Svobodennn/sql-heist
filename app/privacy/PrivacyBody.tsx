import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { ContentPage } from '@/app/components/ContentPage'
import { Callout, LegalSection } from '@/app/components/ContentPage/content-blocks'
import { getServerTranslator } from '@/i18n/server'
import { localeHref } from '@/app/localeMeta'

// Privacy body (Server Component, no client JS). Shared by the unprefixed en
// route (app/privacy/page.tsx) and a future per-locale export; the `locale` prop
// selects the catalog. Clause titles and prose live under `privacy.sections`;
// the numbered clause ids stay in code as stable, non-localized deep-link anchors.
const SECTION_IDS = [
  'what-we-collect',
  'on-your-device',
  'cookies-and-tracking',
  'third-parties',
  'children',
  'changes',
] as const

export function PrivacyBody({ locale }: { locale: Locale }) {
  const t = getServerTranslator(locale)
  return (
    <ContentPage
      eyebrow={t('privacy.eyebrow')}
      title={t('privacy.title')}
      updated="2026-07-30"
      locale={locale}
      lead={t('privacy.lead')}
    >
      <Callout label={t('privacy.glanceLabel')}>
        <p>{t('privacy.glanceBody')}</p>
      </Callout>

      {SECTION_IDS.map((id, i) => (
        <LegalSection key={id} id={id} title={t(`privacy.sections.${i}.title`)}>
          {id === 'changes' ? (
            <p>
              {t(`privacy.sections.${i}.body`)}
              <Link href={localeHref('/contact', locale)}>{t(`privacy.sections.${i}.link`)}</Link>.
            </p>
          ) : (
            <p>{t(`privacy.sections.${i}.body`)}</p>
          )}
        </LegalSection>
      ))}
    </ContentPage>
  )
}
