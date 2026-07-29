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
        <Stamp>Browser-based · sandboxed · no install</Stamp>

        <h1 className={styles.title}>SQL Heist</h1>

        <p className={styles.lede}>
          Learn SQL injection the way attackers actually think — by pulling off three jobs against a
          real SQLite database running entirely in your browser. See the exact query your input
          builds, break it, then learn the fix.
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
          <span>Start the heist</span>
          <IconArrowRight size={18} />
        </Link>
      </div>
    </main>
  )
}
