import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { ContentPage } from '@/app/components/ContentPage'
import { Section } from '@/app/components/ContentPage/content-blocks'
import { IconMail } from '@/app/components/icons'
import { getServerTranslator } from '@/i18n/server'
import { localeHref } from '@/i18n/localeHref'
import styles from '@/app/components/ContentPage/content.module.css'

// Contact body (Server Component, no client JS). Shared by the unprefixed en
// route (app/contact/page.tsx) and a future per-locale export; the `locale` prop
// selects the catalog. All visible prose lives under the `contact` namespace; the
// email address is data (identical in every locale), so it stays a literal.
const EMAIL = 'melih.sarac@hotmail.com'

export function ContactBody({ locale }: { locale: Locale }) {
  const t = getServerTranslator(locale)
  return (
    <ContentPage eyebrow={t('contact.eyebrow')} title={t('contact.title')} lead={t('contact.lead')}>
      <Section title={t('contact.leaveWord.title')}>
        <p>{t('contact.leaveWord.body')}</p>
        <div className={styles.contactCard}>
          <span className={styles.contactIcon}>
            <IconMail size={24} />
          </span>
          <div className={styles.contactMain}>
            <p className={styles.contactLabel}>{t('contact.card.label')}</p>
            <a href={`mailto:${EMAIL}`} className={styles.contactEmail}>
              {EMAIL}
            </a>
            <p className={styles.contactHint}>{t('contact.card.hint')}</p>
          </div>
        </div>
      </Section>

      <div className={styles.followUp}>
        <div className={styles.miniCard}>
          <h2>{t('contact.holes.title')}</h2>
          <p>{t('contact.holes.body')}</p>
        </div>
        <div className={styles.miniCard}>
          <h2>{t('contact.answers.title')}</h2>
          <p>
            {t('contact.answers.pre')}
            <Link href={localeHref('/faq', locale)}>{t('contact.answers.faqLink')}</Link>
            {t('contact.answers.mid')}
            <Link href={localeHref('/help', locale)}>{t('contact.answers.helpLink')}</Link>
            {t('contact.answers.post')}
          </p>
        </div>
      </div>
    </ContentPage>
  )
}
