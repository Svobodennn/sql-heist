import type { Metadata } from 'next'
import Link from 'next/link'
import { ContentPage } from '@/app/components/ContentPage'
import { Callout, LegalSection } from '@/app/components/content-blocks'

export const metadata: Metadata = {
  title: 'Terms of Use — SQL Heist',
  description:
    'The terms for using SQL Heist: an educational game. Use the skills only on systems you own or are authorised to test.',
}

export default function TermsPage() {
  return (
    <ContentPage
      eyebrow="The Fine Print"
      title="Terms of Use"
      updated="2026-07-30"
      lead="Play the game, learn the trade, keep it clean. The details:"
    >
      <Callout label="The short of it">
        <p>
          A free, educational game. Use what it teaches only on systems you own or are authorised to
          test &mdash; everything else is a crime, and it&apos;s on you.
        </p>
      </Callout>

      <LegalSection id="the-deal" title="The deal">
        <p>
          SQL Heist is a free, educational game about how SQL injection works and how to defend
          against it. By using it, you agree to these terms. If you don&apos;t, don&apos;t use it.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="Acceptable use">
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
      </LegalSection>

      <LegalSection id="no-warranty" title="No warranty">
        <p>
          The game and its content are provided &ldquo;as is,&rdquo; without warranties of any kind.
          It&apos;s a teaching tool, not professional security advice, and we don&apos;t promise it is
          error-free or fit for any particular purpose. Real systems are more complicated than a
          practice target.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="Limitation of liability">
        <p>
          To the fullest extent allowed by law, the makers of SQL Heist aren&apos;t liable for any
          damages arising from your use of the game or the skills it teaches.
        </p>
      </LegalSection>

      <LegalSection id="content" title="Content">
        <p>
          The game&apos;s writing, characters, art, and code are ours unless noted otherwise. SQL is
          SQL &mdash; the language and the concepts belong to everyone. Don&apos;t repackage the game
          as your own.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes">
        <p>
          We may update these terms; when we do, we&apos;ll revise the date above. Continuing to play
          after a change means you accept it. Questions? <Link href="/contact">Reach the crew</Link>.
        </p>
      </LegalSection>
    </ContentPage>
  )
}
