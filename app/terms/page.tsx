import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { ContentPage } from '@/app/components/ContentPage'
import { Callout, LegalSection, TableOfContents } from '@/app/components/content-blocks'
import { getServerTranslator } from '@/app/i18n/server'

export const metadata: Metadata = {
  title: 'Terms of Use — SQL Heist',
  description:
    'The terms for using SQL Heist: an educational game. Use the skills only on systems you own or are authorised to test.',
}

// One source of truth for the numbered clauses: the reading column maps it to
// <LegalSection>s and the sticky rail maps it to an "On this page" jump-nav, so
// the two can never drift apart.
const SECTIONS: { id: string; title: string; body: ReactNode }[] = [
  {
    id: 'the-deal',
    title: 'The deal',
    body: (
      <p>
        SQL Heist is a free, educational game about how SQL injection works and how to defend
        against it. By using it, you agree to these terms. If you don&apos;t, don&apos;t use it.
      </p>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: (
      <>
        <p>
          The techniques here are taught for defensive understanding. You agree to use them only
          against systems you own or have explicit, documented permission to test. Attacking systems
          without authorisation is illegal in most places, and you alone are responsible for what you
          do with what you learn.
        </p>
        <p>
          Don&apos;t try to abuse, overload, or reverse the game itself to reach anything other than
          the practice content it ships with.
        </p>
      </>
    ),
  },
  {
    id: 'no-warranty',
    title: 'No warranty',
    body: (
      <p>
        The game and its content are provided &ldquo;as is,&rdquo; without warranties of any kind.
        It&apos;s a teaching tool, not professional security advice, and we don&apos;t promise it is
        error-free or fit for any particular purpose. Real systems are more complicated than a
        practice target.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: (
      <p>
        To the fullest extent allowed by law, the makers of SQL Heist aren&apos;t liable for any
        damages arising from your use of the game or the skills it teaches.
      </p>
    ),
  },
  {
    id: 'content',
    title: 'Content',
    body: (
      <p>
        The game&apos;s writing, characters, art, and code are ours unless noted otherwise. SQL is
        SQL &mdash; the language and the concepts belong to everyone. Don&apos;t repackage the game
        as your own.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes',
    body: (
      <p>
        We may update these terms; when we do, we&apos;ll revise the date above. Continuing to play
        after a change means you accept it. Questions? <Link href="/contact">Reach the crew</Link>.
      </p>
    ),
  },
]

export default function TermsPage() {
  const t = getServerTranslator()
  return (
    <ContentPage
      eyebrow={t('terms.eyebrow')}
      title={t('terms.title')}
      updated="2026-07-30"
      lead={t('terms.lead')}
      aside={<TableOfContents items={SECTIONS.map((s) => ({ href: `#${s.id}`, label: s.title }))} />}
    >
      <Callout label="The short of it">
        <p>
          A free, educational game. Use what it teaches only on systems you own or are authorised to
          test &mdash; everything else is a crime, and it&apos;s on you.
        </p>
      </Callout>

      {SECTIONS.map((section) => (
        <LegalSection key={section.id} id={section.id} title={section.title}>
          {section.body}
        </LegalSection>
      ))}
    </ContentPage>
  )
}
