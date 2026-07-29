import type { Metadata } from 'next'
import Link from 'next/link'
import { ContentPage } from '@/app/components/ContentPage'

export const metadata: Metadata = {
  title: 'Privacy — SQL Heist',
  description:
    'How SQL Heist handles your data: no accounts, no tracking, progress stored locally in your browser. It runs entirely client-side.',
}

export default function PrivacyPage() {
  return (
    <ContentPage
      eyebrow="The Fine Print"
      title="Privacy"
      updated="2026-07-30"
      lead="Short version: we don't collect you. The long version is below, and it's still short."
    >
      <section>
        <h2>What we collect</h2>
        <p>
          Nothing that identifies you. SQL Heist has no account system in this build, no sign-up, and
          no login (the &ldquo;Sign in&rdquo; link is a placeholder for a future release). We don&apos;t
          ask for your name, email, or anything else to play.
        </p>
      </section>

      <section>
        <h2>What stays on your device</h2>
        <p>
          Your progress &mdash; which jobs you&apos;ve finished and your best scores &mdash; is saved
          in your browser&apos;s local storage, on your device. It never leaves the browser and we
          have no way to read it. Clearing your browser data removes it.
        </p>
      </section>

      <section>
        <h2>Cookies and tracking</h2>
        <p>
          The game sets no tracking or advertising cookies and includes no third-party analytics in
          this build. If that ever changes, we&apos;ll update this page and this date before it does.
        </p>
      </section>

      <section>
        <h2>Third parties</h2>
        <p>
          The game is a static site. Fonts are bundled at build time and the database engine runs
          locally in your browser, so ordinary play makes no third-party requests. Whoever hosts the
          site may keep standard server logs (such as IP addresses) for security and operations; that
          handling is governed by the host&apos;s own policies.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          SQL Heist is a learning tool aimed at developers. It isn&apos;t directed at children under
          13 and doesn&apos;t knowingly collect their data.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          If we update how any of this works, we&apos;ll revise this page and the &ldquo;last
          updated&rdquo; date above. Questions? <Link href="/contact">Reach the crew</Link>.
        </p>
      </section>
    </ContentPage>
  )
}
