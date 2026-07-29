import type { Metadata } from 'next'
import Link from 'next/link'
import { ContentPage } from '@/app/components/ContentPage'
import { IconArrowRight } from '@/app/components/icons'
import styles from '@/app/components/content.module.css'

export const metadata: Metadata = {
  title: 'How the job works — SQL Heist',
  description:
    'How to play SQL Heist: five moves per job — Brief, Recon, Exploit, Loot, Debrief. Read the wire, run your payload, learn the fix.',
}

export default function HelpPage() {
  return (
    <ContentPage
      eyebrow="The Briefing"
      title="How the job works"
      lead="The Fixer doesn't repeat himself. Read it once, then go earn."
    >
      <section>
        <h2>Before you touch anything</h2>
        <p>
          Every job points you at Meridian &mdash; a data broker that got rich holding other
          people&apos;s secrets. Behind each of its doors is a <strong>real SQLite database</strong>,
          running in your browser. No simulation, no scripted answers. You break in with a genuine SQL
          injection, then you learn exactly how they should have stopped you.
        </p>
        <p>
          Nothing here reaches the network. The engine loads on demand, the database is seeded fresh
          for every run, and the only thing you can break is the practice target.
        </p>
      </section>

      <section>
        <h2>The five moves</h2>
        <p>Each job runs the same arc. You always know where you are in it.</p>
        <ol>
          <li>
            <strong>Brief.</strong> The Fixer tells you the mark and the take &mdash; never the
            method. He points at the door; you figure out the lock.
          </li>
          <li>
            <strong>Recon.</strong> Case the target&apos;s front. Find where your input actually goes.
            The schema you&apos;re shown is never the whole building.
          </li>
          <li>
            <strong>Exploit.</strong> The heart of it. Type into the mark&apos;s form and watch the
            real query it builds &mdash; live, on the wire &mdash; then run it.
          </li>
          <li>
            <strong>Loot.</strong> The take, your score, and how clean you were. Nobody stopped you.
          </li>
          <li>
            <strong>Debrief.</strong> The other side of the job: the vulnerable code next to the fix
            that closes it. This is the part that makes you dangerous on defense.
          </li>
        </ol>
      </section>

      <section>
        <h2>Reading the wire</h2>
        <p>
          The Exploit screen shows two faces of the same moment. On the left, the ordinary form the
          victim sees. On the right, the raw SQL your input becomes. Colour carries meaning &mdash;
          and it never rides on colour alone:
        </p>
        <ul>
          <li>
            <strong>Crimson</strong> is your input, read as code. That&apos;s the break-out &mdash; the
            moment data stops being data.
          </li>
          <li>
            <strong>Steel blue</strong> is the query&apos;s own keywords &mdash; the structure the
            system wrote.
          </li>
          <li>
            <strong>Dimmed and struck through</strong> is what your comment killed. If it&apos;s grey,
            it never ran.
          </li>
        </ul>
      </section>

      <section>
        <h2>Controls</h2>
        <ul>
          <li>
            Run your payload with <span className="kbd">&#8984;</span> /{' '}
            <span className="kbd">Ctrl</span> + <span className="kbd">Enter</span>, or the{' '}
            <strong>Inject / Run</strong> button.
          </li>
          <li>
            <strong>Reset</strong> wipes your input and reseeds the database. Every run starts from a
            clean table anyway.
          </li>
          <li>
            Full keyboard navigation throughout. <span className="kbd">Esc</span> closes any dialog.
          </li>
        </ul>
      </section>

      <section>
        <h2>Stuck? Call the Fixer</h2>
        <p>
          Every job carries three hints, opened in order: a word, then the method, then the play.
          They cost score, so spend them like they&apos;re yours. Guessing blind is for amateurs and
          dead men &mdash; but a nudge beats staring.
        </p>
      </section>

      <section>
        <h2>The point</h2>
        <p>
          This isn&apos;t a game about pulling off crimes. It&apos;s a game about seeing the one flaw
          that makes them possible &mdash; so you recognise it in the wild and shut it. You learn the
          break-in so you can build the lock.
        </p>
        <p className={styles.ctaRow}>
          <Link href="/jobs" className="btn btn--primary">
            <span>See the board</span>
            <IconArrowRight size={18} />
          </Link>
        </p>
      </section>
    </ContentPage>
  )
}
