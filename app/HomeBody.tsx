import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { IconArrowRight, IconCheck } from '@/app/components/icons'
import { Logo } from '@/app/components/Logo'
import { JsonLd } from '@/app/components/JsonLd'
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from './siteConfig'
import { buildHomeContent, buildTickerTrack } from './homeContent'
import { localeHref } from '@/i18n/localeHref'
import styles from './page.module.css'

// Landing body (Server Component, fully static — no "use client", zero client JS).
// Shared by the unprefixed en route (app/page.tsx) and the /tr, /pl static routes
// (app/[locale]/page.tsx); the locale prop selects which catalog it renders from.
// It ships NO engine/WASM: the SQL teaser and marquee are plain styled markup, so
// first paint stays light. The marquee is pure-CSS, aria-hidden, reduced-motion-safe.
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

export function HomeBody({ locale }: { locale: Locale }) {
  const { copy, ticker, loop, faqTeasers } = buildHomeContent(locale)
  const { hero, what, how, faq, closer } = copy

  return (
    <main className={styles.page}>
      <JsonLd data={websiteLd} />
      <JsonLd data={softwareLd} />
      {/* ---------- Hero ---------- */}
      <section className={styles.hero}>
        {/* Cinematic key-art backdrop (the break-in scene) under a dark left→right
            scrim, plus scanline/vignette. Decorative, static, non-interactive. */}
        <div className={styles.heroPhoto} aria-hidden="true" />
        <div className={styles.heroScan} aria-hidden="true" />

        <div className={styles.heroInner}>
          <div className={styles.heroLeft}>
            <p className={styles.slate}>
              <span className={styles.recDot} aria-hidden="true" />
              <Logo size={18} className={styles.slateMark} />
              <span className="stamp">{hero.eyebrow}</span>
            </p>

            {/* Colossal two-line wordmark; the last word carries the teal. Words come
                from the localized title, so the accent tracks whatever it splits into. */}
            <h1 className={styles.title}>
              {hero.title.split(' ').map((word, i, words) => (
                <span
                  key={i}
                  className={`${styles.titleWord}${i === words.length - 1 ? ` ${styles.titleAccent}` : ''}`}
                >
                  {word}
                </span>
              ))}
            </h1>
            <p className={styles.tagline}>{hero.tagline}</p>
            <p className={styles.lede}>{hero.lede}</p>

            <div className={styles.heroCtas}>
              <Link href={localeHref('/cases', locale)} className="btn btn--primary">
                <span>{hero.primaryCta}</span>
                <IconArrowRight size={18} />
              </Link>
              <a href="#how-it-works" className="btn btn--ghost">
                {hero.secondaryCta}
              </a>
            </div>
          </div>

          {/* The wire: your input has stopped being data. The payload types itself
              in (pure CSS), the caret sits where you typed, and everything past the
              -- is dead code. Decorative — hidden from assistive tech. */}
          <div className={styles.heroSlab} aria-hidden="true">
            <div className={styles.slabBar}>
              <span>meridian · /login</span>
              <span className={styles.slabDots}>
                <i />
                <i />
                <i />
              </span>
            </div>
            <div className={styles.slabBody}>
              <pre className={styles.teaser}>
                <code>
                  <span className={styles.kw}>SELECT</span> * <span className={styles.kw}>FROM</span>{' '}
                  users <span className={styles.kw}>WHERE</span> name = &apos;
                  <span className={styles.inj}>&apos; OR &apos;1&apos;=&apos;1&apos; --</span>
                  <span className={styles.caret} />
                  <span className={styles.dim}> &apos; AND pass = &apos;…&apos;</span>
                </code>
              </pre>
              {/* The breach lands after the payload finishes typing (CSS-timed). */}
              <div className={styles.slabResult}>
                <span className={styles.slabGranted}>
                  <IconCheck size={15} />
                  ACCESS GRANTED · admin
                </span>
                <span className={styles.slabLoot}>loot: session_token</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Marquee (decorative ticker band) ---------- */}
      <div className={styles.ticker} aria-hidden="true">
        <div className={styles.tickerTrack}>
          {buildTickerTrack(ticker).map((item, i) => (
            <span key={i} className={styles.tickerItem}>
              <span className={item.kind === 'payload' ? styles.tickerPayload : styles.tickerLine}>
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
            {loop.map((step, i) => (
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
            {faqTeasers.map((item) => (
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
            <Link href={localeHref('/faq', locale)}>
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
            <Link href={localeHref('/cases', locale)} className="btn btn--primary">
              <span>{closer.cta}</span>
              <IconArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
