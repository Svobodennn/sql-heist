import type { Metadata } from 'next'
import Link from 'next/link'
import { ContentPage } from '@/app/components/ContentPage'
import { Section } from '@/app/components/content-blocks'
import { IconMail } from '@/app/components/icons'
import { getServerTranslator } from '@/app/i18n/server'
import styles from '@/app/components/content.module.css'

export const metadata: Metadata = {
  title: 'Contact — SQL Heist',
  description: 'Reach the SQL Heist crew: report a bug, ask a question, or leave word.',
}

const EMAIL = 'melih.sarac@hotmail.com'

export default function ContactPage() {
  const t = getServerTranslator()
  return (
    <ContentPage
      eyebrow={t('contact.eyebrow')}
      title={t('contact.title')}
      lead={t('contact.lead')}
      aside={
        <aside className={styles.rail}>
          <div className={styles.miniCard}>
            <h2>Found a hole in our game instead of theirs?</h2>
            <p>
              Good. If something&apos;s broken, exploitable, or just wrong, tell us the same way.
              We&apos;d rather hear it from you than read about it later.
            </p>
          </div>
          <div className={styles.miniCard}>
            <h2>Looking for answers, not a person?</h2>
            <p>
              Most first questions are already handled. Try the <Link href="/faq">FAQ</Link> or the{' '}
              <Link href="/help">how-it-works page</Link> &mdash; you&apos;ll probably be back on a
              job faster.
            </p>
          </div>
        </aside>
      }
    >
      <Section title="Leave word">
        <p>
          This build ships without a contact form &mdash; the whole game runs client-side, so
          there&apos;s no server here to take a message. Until the wire is properly live, email is the
          channel:
        </p>
        <div className={styles.contactCard}>
          <span className={styles.contactIcon}>
            <IconMail size={24} />
          </span>
          <div className={styles.contactMain}>
            <p className={styles.contactLabel}>Email the crew</p>
            <a href={`mailto:${EMAIL}`} className={styles.contactEmail}>
              {EMAIL}
            </a>
            <p className={styles.contactHint}>
              One inbox, read by a person. Steps to reproduce beat a vague &ldquo;it doesn&apos;t
              work&rdquo; every time.
            </p>
          </div>
        </div>
      </Section>
    </ContentPage>
  )
}
