import type { Metadata } from 'next'
import Link from 'next/link'
import { ContentPage } from '@/app/components/ContentPage'
import { IconMail } from '@/app/components/icons'
import styles from '@/app/components/content.module.css'

export const metadata: Metadata = {
  title: 'Contact — SQL Heist',
  description: 'Reach the SQL Heist crew: report a bug, ask a question, or leave word.',
}

export default function ContactPage() {
  return (
    <ContentPage
      eyebrow="The Wire"
      title="Reach the crew"
      lead="No phone number. No front desk. Leave word and someone gets back to you."
    >
      <section>
        <h2>Leave word</h2>
        <p>
          This build ships without a contact form &mdash; the whole game runs client-side, so
          there&apos;s no server here to take a message. Until the wire is properly live, email is the
          channel:
        </p>
        <p className={styles.ctaRow}>
          {/* Placeholder address on the RFC-2606 .example TLD until the real inbox is wired up. */}
          <a href="mailto:fixer@sqlheist.example" className="btn btn--ghost">
            <IconMail size={18} />
            <span>fixer@sqlheist.example</span>
          </a>
        </p>
      </section>

      <section>
        <h2>Found a hole in our game instead of theirs?</h2>
        <p>
          Good. If something&apos;s broken, exploitable, or just wrong, tell us the same way &mdash;
          steps to reproduce beat a vague &ldquo;it doesn&apos;t work&rdquo; every time. We&apos;d
          rather hear it from you than read about it later.
        </p>
      </section>

      <section>
        <h2>Looking for answers, not a person?</h2>
        <p>
          Most first questions are already handled. Try the <Link href="/faq">FAQ</Link> or the{' '}
          <Link href="/help">how-it-works page</Link> before you write &mdash; you&apos;ll probably be
          back on a job faster.
        </p>
      </section>
    </ContentPage>
  )
}
