import type { Metadata } from 'next'
import Link from 'next/link'
import { ContentPage } from '@/app/components/ContentPage'
import { Callout, Section } from '@/app/components/content-blocks'
import { IconArrowRight } from '@/app/components/icons'
import { cx } from '@/app/components/cx'
import { getServerTranslator } from '@/app/i18n/server'
import styles from '@/app/components/content.module.css'

export const metadata: Metadata = {
  title: 'How the job works — SQL Heist',
  description:
    'How to play SQL Heist: five moves per job — Brief, Recon, Exploit, Loot, Debrief. Read the wire, run your payload, learn the fix.',
}

const MOVES: { title: string; body: string }[] = [
  {
    title: 'Brief',
    body: 'The Fixer names the mark and the take — never the method. He points at the door; you work out the lock.',
  },
  {
    title: 'Recon',
    body: "Case the target's front. Find where your input actually lands. The schema you're shown is never the whole building.",
  },
  {
    title: 'Exploit',
    body: "The heart of it. Type into the mark's form and watch the real query your input builds — live, on the wire — then run it.",
  },
  {
    title: 'Loot',
    body: 'The take, your score, and how clean you were. Nobody stopped you. That is the whole point.',
  },
  {
    title: 'Debrief',
    body: 'The other side of the job: the vulnerable code beside the fix that closes it. This is the part that makes you dangerous on defence.',
  },
]

export default function HelpPage() {
  const t = getServerTranslator()
  return (
    <ContentPage eyebrow={t('help.eyebrow')} title={t('help.title')} lead={t('help.lead')}>
      <Section id="before" title={t('help.sectionBefore')}>
        <p>
          Every job points you at Meridian &mdash; a data broker that got rich holding other
          people&apos;s secrets. Behind each of its doors is a <strong>real SQLite database</strong>,
          running in your browser. No simulation, no scripted answers. You break in with a genuine SQL
          injection, then you learn exactly how they should have stopped you.
        </p>
        <Callout label={t('help.calloutSafe')}>
          <p>
            Nothing here reaches the network. The engine loads on demand, the database is seeded fresh
            for every run, and the only thing you can break is the practice target.
          </p>
        </Callout>
      </Section>

      <Section id="moves" title={t('help.sectionMoves')}>
        <p>Every job runs the same arc. You always know where you are in it.</p>
        <ol className={styles.steps}>
          {MOVES.map((move) => (
            <li key={move.title} className={styles.step}>
              <div className={styles.stepMarker}>
                <span className={styles.stepNum} aria-hidden="true" />
                <span className={styles.stepLine} aria-hidden="true" />
              </div>
              <div className={styles.stepBody}>
                <h3>{move.title}</h3>
                <p>{move.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="wire" title={t('help.sectionWire')}>
        <p>
          The Exploit screen shows two faces of the same moment. On the left, the ordinary form the
          victim sees. On the right, the raw SQL your input becomes. Colour carries meaning &mdash; and
          it never rides on colour alone:
        </p>
        <ul className={styles.legend}>
          <li className={styles.legendItem}>
            <span className={cx(styles.swatch, styles.swatchInj)} aria-hidden="true" />
            <p>
              <strong>Crimson</strong> is your input, read as code &mdash; the break-out, the moment
              data stops being data.
            </p>
          </li>
          <li className={styles.legendItem}>
            <span className={cx(styles.swatch, styles.swatchKw)} aria-hidden="true" />
            <p>
              <strong>Steel blue</strong> is the query&apos;s own keywords &mdash; the structure the
              system wrote.
            </p>
          </li>
          <li className={styles.legendItem}>
            <span className={cx(styles.swatch, styles.swatchDim)} aria-hidden="true" />
            <p>
              <strong>Dimmed and struck through</strong> is what your comment killed. If it&apos;s
              grey, it never ran.
            </p>
          </li>
        </ul>
      </Section>

      <Section id="controls" title={t('help.sectionControls')}>
        <ul className={styles.keyRows}>
          <li className={styles.keyRow}>
            <span>Run your payload with</span>
            <span className="kbd">&#8984;</span>
            <span>/</span>
            <span className="kbd">Ctrl</span>
            <span>+</span>
            <span className="kbd">Enter</span>
            <span>, or the</span>
            <strong>Inject / Run</strong>
            <span>button.</span>
          </li>
          <li className={styles.keyRow}>
            <strong>Reset</strong>
            <span>wipes your input and reseeds the database. Every run starts clean anyway.</span>
          </li>
          <li className={styles.keyRow}>
            <span>Full keyboard navigation throughout.</span>
            <span className="kbd">Esc</span>
            <span>closes any dialog.</span>
          </li>
        </ul>
      </Section>

      <Section id="stuck" title={t('help.sectionStuck')}>
        <p>
          Every job carries three hints, opened in order: a word, then the method, then the play. They
          cost score, so spend them like they&apos;re yours. Guessing blind is for amateurs and dead
          men &mdash; but a nudge beats staring.
        </p>
      </Section>

      <Section id="point" title={t('help.sectionPoint')}>
        <p>
          This isn&apos;t a game about pulling off crimes. It&apos;s a game about seeing the one flaw
          that makes them possible &mdash; so you recognise it in the wild and shut it. You learn the
          break-in so you can build the lock.
        </p>
        <div className={styles.ctaRow}>
          <Link href="/jobs" className="btn btn--primary">
            <span>{t('help.cta')}</span>
            <IconArrowRight size={18} />
          </Link>
        </div>
      </Section>
    </ContentPage>
  )
}
