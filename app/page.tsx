import Link from 'next/link'
import { IconArrowRight, IconCheck } from '@/app/components/icons'
import { Logo } from '@/app/components/Logo'
import { JsonLd } from '@/app/components/JsonLd'
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from './siteConfig'
import {
  HOME_COPY,
  HEIST_LOOP,
  FAQ_TEASERS,
  TICKER_ITEMS,
  buildTickerTrack,
} from './homeContent'
import styles from './page.module.css'

// Landing (Server Component, fully static — no "use client", zero client JS).
// It ships NO engine/WASM: the SQL teaser and marquee are plain styled markup,
// not the interactive preview, so first paint stays light (docs/01-architecture
// §2.1: the landing must not block on WASM). The marquee is pure-CSS transform,
// aria-hidden, and pauses under prefers-reduced-motion.
// Structured data: the site + the game-as-software entity (free, browser-based).
const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
}
const softwareLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  applicationCategory: 'GameApplication',
  operatingSystem: 'Web browser',
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
}

export default function HomePage() {
  const { hero, what, how, faq, closer } = HOME_COPY

  return (
    <main className={styles.page}>
      <JsonLd data={websiteLd} />
      <JsonLd data={softwareLd} />
      {/* ---------- Hero ---------- */}
      <section className={styles.hero}>
        {/* Faint scanline + vignette. Decorative, static, non-interactive. */}
        <div className={styles.heroScan} aria-hidden="true" />

        <div className={styles.heroInner}>
          <Logo size={72} className={styles.heroLogo} />
          <span className="stamp">{hero.eyebrow}</span>

          <h1 className={styles.title}>{hero.title}</h1>

          <p className={styles.tagline}>{hero.tagline}</p>

          <p className={styles.lede}>{hero.lede}</p>

          {/* The wire: your input has stopped being data. The blinking caret
              sits where you just typed; everything past the -- is dead code. */}
          <pre className={styles.teaser} aria-hidden="true">
            <code>
              <span className={styles.kw}>SELECT</span> * <span className={styles.kw}>FROM</span>{' '}
              users <span className={styles.kw}>WHERE</span> name = &apos;
              <span className={styles.inj}>&apos; OR &apos;1&apos;=&apos;1&apos; --</span>
              <span className={styles.caret} />
              <span className={styles.dim}> &apos; AND pass = &apos;…&apos;</span>
            </code>
          </pre>

          <div className={styles.heroCtas}>
            <Link href="/jobs" className="btn btn--primary">
              <span>{hero.primaryCta}</span>
              <IconArrowRight size={18} />
            </Link>
            <a href="#how-it-works" className="btn btn--ghost">
              {hero.secondaryCta}
            </a>
          </div>
        </div>
      </section>

      {/* ---------- Marquee (decorative ticker band) ---------- */}
      <div className={styles.ticker} aria-hidden="true">
        <div className={styles.tickerTrack}>
          {buildTickerTrack(TICKER_ITEMS).map((item, i) => (
            <span key={i} className={styles.tickerItem}>
              <span
                className={item.kind === 'payload' ? styles.tickerPayload : styles.tickerLine}
              >
                {item.text}
              </span>
              <span className={styles.tickerSep} />
            </span>
          ))}
        </div>
      </div>

      {/* ---------- What is this — case-file dossier ---------- */}
      <section className={styles.section} aria-labelledby="what-heading">
        <div className="container">
          <div className={styles.dossier}>
            <div className={styles.dossierTab}>
              <span className="stamp">{what.eyebrow}</span>
              <span className={styles.classified}>{what.stamp}</span>
            </div>
            <div className={styles.dossierBody}>
              <h2 id="what-heading" className={styles.sectionTitle}>
                {what.title}
              </h2>
              <p className={styles.sectionLede}>{what.lede}</p>

              <dl className={styles.facts}>
                {what.facts.map((fact) => (
                  <div key={fact.k} className={styles.fact}>
                    <dt>{fact.k}</dt>
                    <dd>{fact.v}</dd>
                  </div>
                ))}
              </dl>

              <p className={styles.safeChip}>
                <IconCheck size={16} />
                <span>{what.safe}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- How it works — the five moves ---------- */}
      <section id="how-it-works" className={styles.section} aria-labelledby="how-heading">
        <div className="container">
          <div className={styles.sectionHead}>
            <span className="stamp">{how.eyebrow}</span>
            <h2 id="how-heading" className={styles.sectionTitle}>
              {how.title}
            </h2>
            <p className={styles.sectionLede}>{how.lede}</p>
          </div>

          <ol className={styles.loop}>
            {HEIST_LOOP.map((step, i) => (
              <li key={step.title} className={styles.loopStep}>
                <span className={styles.loopNum} aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className={styles.loopTitle}>{step.title}</h3>
                <p className={styles.loopBlurb}>{step.blurb}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- FAQ — native <details>, no JS ---------- */}
      <section className={styles.section} aria-labelledby="faq-heading">
        <div className="container">
          <div className={styles.sectionHead}>
            <span className="stamp">{faq.eyebrow}</span>
            <h2 id="faq-heading" className={styles.sectionTitle}>
              {faq.title}
            </h2>
          </div>

          <div className={styles.faqList}>
            {FAQ_TEASERS.map((item) => (
              <details key={item.q} className={styles.faq}>
                <summary className={styles.faqSummary}>
                  <span>{item.q}</span>
                  <span className={styles.faqIcon} aria-hidden="true" />
                </summary>
                <div className={styles.faqAnswer}>
                  <p>{item.a}</p>
                </div>
              </details>
            ))}
          </div>

          <p className={styles.faqMore}>
            <Link href="/faq">
              <span>{faq.more}</span>
              <IconArrowRight size={16} />
            </Link>
          </p>
        </div>
      </section>

      {/* ---------- Closer — a word from the Fixer ---------- */}
      <section className={styles.closer} aria-labelledby="closer-heading">
        <div className="container">
          <div className={styles.closerInner}>
            <Logo size={34} className={styles.closerMark} />
            <p className={styles.fixer}>
              <span className={styles.fixerName}>{closer.fixerName}</span>
              <span className={styles.fixerLine}>{closer.fixerLine}</span>
            </p>
            <h2 id="closer-heading" className={styles.closerTitle}>
              {closer.title}
            </h2>
            <Link href="/jobs" className="btn btn--primary">
              <span>{closer.cta}</span>
              <IconArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
