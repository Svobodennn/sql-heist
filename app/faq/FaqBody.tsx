import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { ContentPage } from '@/app/components/ContentPage'
import { JsonLd } from '@/app/components/JsonLd'
import { getServerTranslator } from '@/i18n/server'
import { localeHref } from '@/i18n/localeHref'
import styles from '@/app/components/ContentPage/content.module.css'

// FAQ body (Server Component, no client JS). Shared by the unprefixed en route
// (app/faq/page.tsx) and a future per-locale export; the `locale` prop selects
// which catalog it renders from. Q/A pairs live in the `faq.items` catalog as
// plain strings and are the SINGLE source of truth: both the rendered <details>
// list and the FAQPage JSON-LD read from them, so the two never drift apart.
const ITEMS = ['0', '1', '2', '3', '4', '5', '6', '7'] as const

export function FaqBody({ locale }: { locale: Locale }) {
  const t = getServerTranslator(locale)
  const items = ITEMS.map((i) => ({ q: t(`faq.items.${i}.q`), a: t(`faq.items.${i}.a`) }))

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  return (
    <ContentPage eyebrow={t('faq.eyebrow')} title={t('faq.title')} lead={t('faq.lead')}>
      <JsonLd data={faqLd} />
      <h2 className="sr-only">{t('faq.srHeading')}</h2>
      <div className={styles.faqList}>
        {items.map((item, i) => (
          <details key={i} className={styles.faq}>
            <summary className={styles.faqSummary}>
              <span>{item.q}</span>
              <span className={styles.faqIcon} aria-hidden="true" />
            </summary>
            <div className={styles.faqAnswer}>
              <p>{item.a}</p>
            </div>
          </details>
        ))}
      </div>

      <div className={styles.followUp}>
        <div className={styles.miniCard}>
          <h2>{t('faq.stillStuck')}</h2>
          <p>
            {t('faq.followUp.pre')}
            <Link href={localeHref('/help', locale)}>{t('faq.followUp.helpLink')}</Link>
            {t('faq.followUp.mid')}
            <Link href={localeHref('/contact', locale)}>{t('faq.followUp.contactLink')}</Link>
            {t('faq.followUp.post')}
          </p>
        </div>
      </div>
    </ContentPage>
  )
}
