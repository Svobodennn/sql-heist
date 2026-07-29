import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { ContentPage } from '@/app/components/ContentPage'
import styles from '@/app/components/content.module.css'

export const metadata: Metadata = {
  title: 'FAQ — SQL Heist',
  description:
    'Straight answers about SQL Heist: is it legal, do you need to install anything, where your progress is saved, and who this is for.',
}

const FAQS: { q: string; a: ReactNode }[] = [
  {
    q: 'Is this legal?',
    a: (
      <p>
        Yes. Every job runs entirely in your browser against a sandboxed SQLite database that ships
        with the game. There are no real systems on the other side, no network calls, and nothing to
        break but the practice target.
      </p>
    ),
  },
  {
    q: 'Do I need to install anything?',
    a: (
      <p>
        No. It runs in a modern browser. The database engine (SQLite compiled to WebAssembly) loads on
        demand the first time you need it &mdash; no accounts, no downloads, no setup.
      </p>
    ),
  },
  {
    q: 'Do I need to know SQL already?',
    a: (
      <p>
        It helps. The game assumes you can read a <code>SELECT</code> and roughly follow a{' '}
        <code>WHERE</code> clause. It teaches you injection &mdash; not SQL from zero. If queries are
        brand new to you, learn the basics first, then come pull a job.
      </p>
    ),
  },
  {
    q: 'Are you teaching people to attack real websites?',
    a: (
      <p>
        We teach how injection works so you can recognise it and close it &mdash; every job ends with
        the fix, not the break-in. Use what you learn only on systems you own or have explicit
        permission to test. Anywhere else is a crime, and that&apos;s on you.
      </p>
    ),
  },
  {
    q: 'Where is my progress saved?',
    a: (
      <p>
        On this device, in your browser&apos;s local storage. There&apos;s no account and no server,
        so we never see it. Clear your browser data &mdash; or open the game somewhere else &mdash;
        and you start fresh.
      </p>
    ),
  },
  {
    q: 'Does it cost anything?',
    a: <p>No. It&apos;s free to play.</p>,
  },
  {
    q: 'The engine won&apos;t load / something looks broken.',
    a: (
      <p>
        Refresh first. If it still won&apos;t start, your browser may be blocking WebAssembly or
        running in a locked-down mode &mdash; try a current version of Chrome, Firefox, or Safari with
        default settings.
      </p>
    ),
  },
  {
    q: 'Can I play in my language?',
    a: (
      <p>
        English only for now. Turkish and Polish are on the board &mdash; the language switch in the
        nav is a placeholder until they land.
      </p>
    ),
  },
]

export default function FaqPage() {
  return (
    <ContentPage
      eyebrow="Straight Answers"
      title="Questions the Fixer answers once"
      lead="No small talk. Here's what people ask before their first job."
    >
      <div className={styles.faqList}>
        {FAQS.map((item, i) => (
          <details key={i} className={styles.faq}>
            <summary className={styles.faqSummary}>{item.q}</summary>
            <div className={styles.faqAnswer}>{item.a}</div>
          </details>
        ))}
      </div>

      <section>
        <h2>Still stuck?</h2>
        <p>
          The <Link href="/help">how-it-works page</Link> walks through a full job, or{' '}
          <Link href="/contact">leave word</Link> and we&apos;ll get back to you.
        </p>
      </section>
    </ContentPage>
  )
}
