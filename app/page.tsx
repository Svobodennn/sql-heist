import Link from 'next/link'
import { Stamp } from '@/features/game/components/Stamp'
import { IconArrowRight } from '@/features/game/components/icons'
import styles from './page.module.css'

// Landing (Server Component, fully static). Ships NO engine/WASM — the SQL teaser
// below is plain styled markup, not the interactive preview, so the first paint
// stays light (docs/01-architecture.md §2.1: landing must not block on WASM).
export default function HomePage() {
  return (
    <main className={styles.hero}>
      <div className={styles.inner}>
        <Stamp>MERIDIAN HOLDINGS · after hours</Stamp>

        <h1 className={styles.title}>SQL Heist</h1>

        <p className={styles.tagline}>Every system has a door somebody forgot to lock.</p>

        <p className={styles.lede}>
          You find them. A real database is on the other side — no simulation, no safety net but the
          sandbox. Pull three jobs. Then learn how they should&apos;ve stopped you.
        </p>

        <pre className={styles.teaser} aria-hidden="true">
          <code>
            <span className={styles.kw}>SELECT</span> * <span className={styles.kw}>FROM</span>{' '}
            users <span className={styles.kw}>WHERE</span> name = &apos;
            <span className={styles.inj}>&apos; OR &apos;1&apos;=&apos;1&apos; --</span>
            <span className={styles.dim}> &apos; AND pass = &apos;…&apos;</span>
          </code>
        </pre>

        <Link href="/jobs" className="btn btn--primary">
          <span>Take the first job</span>
          <IconArrowRight size={18} />
        </Link>
      </div>
    </main>
  )
}
