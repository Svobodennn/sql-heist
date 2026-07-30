import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { ContentPage } from '@/app/components/ContentPage'
import { Callout, LegalSection } from '@/app/components/content-blocks'
import { getServerTranslator } from '@/app/i18n/server'

export const metadata: Metadata = {
  title: 'Privacy — SQL Heist',
  description:
    'How SQL Heist handles your data: no accounts, no tracking, progress stored locally in your browser. It runs entirely client-side.',
}

// One source of truth for the numbered clauses: the centred reading column maps
// each to a <LegalSection> (auto-numbered 01, 02, … with a deep-link anchor).
const SECTIONS: { id: string; title: string; body: ReactNode }[] = [
  {
    id: 'what-we-collect',
    title: 'What we collect',
    body: (
      <p>
        Nothing that identifies you. SQL Heist has no account system in this build, no sign-up, and
        no login (the &ldquo;Sign in&rdquo; link is a placeholder for a future release). We
        don&apos;t ask for your name, email, or anything else to play.
      </p>
    ),
  },
  {
    id: 'on-your-device',
    title: 'What stays on your device',
    body: (
      <p>
        Your progress &mdash; which jobs you&apos;ve finished and your best scores &mdash; is saved
        in your browser&apos;s local storage, on your device. It never leaves the browser and we
        have no way to read it. Clearing your browser data removes it.
      </p>
    ),
  },
  {
    id: 'cookies-and-tracking',
    title: 'Cookies and tracking',
    body: (
      <p>
        The game sets no tracking or advertising cookies and includes no third-party analytics in
        this build. If that ever changes, we&apos;ll update this page and this date before it does.
      </p>
    ),
  },
  {
    id: 'third-parties',
    title: 'Third parties',
    body: (
      <p>
        The game is a static site. Fonts are bundled at build time and the database engine runs
        locally in your browser, so ordinary play makes no third-party requests. Whoever hosts the
        site may keep standard server logs (such as IP addresses) for security and operations; that
        handling is governed by the host&apos;s own policies.
      </p>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: (
      <p>
        SQL Heist is a learning tool aimed at developers. It isn&apos;t directed at children under
        13 and doesn&apos;t knowingly collect their data.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes',
    body: (
      <p>
        If we update how any of this works, we&apos;ll revise this page and the &ldquo;last
        updated&rdquo; date above. Questions? <Link href="/contact">Reach the crew</Link>.
      </p>
    ),
  },
]

export default function PrivacyPage() {
  const t = getServerTranslator()
  return (
    <ContentPage
      eyebrow={t('privacy.eyebrow')}
      title={t('privacy.title')}
      updated="2026-07-30"
      lead={t('privacy.lead')}
    >
      <Callout label="At a glance">
        <p>
          No accounts. No tracking. No analytics in this build. Your progress lives in your
          browser&apos;s local storage on your device &mdash; we have no server that can read it.
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
