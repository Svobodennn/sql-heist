import Image from 'next/image'
import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { localeHref } from '@/i18n/localeHref'
import { IconArrowRight, IconCheck } from '@/app/components/icons'
import { DataFlowSchematic } from '@/app/components/DataFlowSchematic'
import { Logo } from '@/app/components/Logo'
import { JsonLd } from '@/app/components/JsonLd'
import { artworkForCase } from '@/features/game/components/CaseCard/caseArtwork'
import { buildHomeContent, buildTickerTrack, type HomeCase } from './homeContent'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from './siteConfig'
import styles from './cinematic-home.module.css'

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

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className={styles.eyebrow}>
      <i aria-hidden="true" />
      {children}
    </p>
  )
}

function LiveFirePanel() {
  return (
    <article className={styles.liveFire} aria-labelledby="live-fire-title" data-reveal="right">
      <header className={styles.liveFireHeader}>
        <span id="live-fire-title">LIVE FIRE: USERS.SEARCH</span>
        <b>
          <i aria-hidden="true" /> INJECTION MODE
        </b>
      </header>

      <div className={styles.payloadRow}>
        <span className={styles.panelLabel}>YOUR INPUT</span>
        <div className={styles.payloadControl}>
          <code className={styles.payloadInput} aria-label="' OR '1'='1' --">
            <span className={styles.typedPayload}>&apos; OR &apos;1&apos;=&apos;1&apos; --</span>
            <span className={styles.typedCaret} aria-hidden="true" />
          </code>
          <span className={styles.runTrigger} aria-hidden="true">
            ▶
          </span>
        </div>
      </div>

      <div className={styles.fireOutput}>
        <div>
          <span className={styles.panelLabel}>EXECUTED SQL</span>
          <pre>
            <code>
              <span className={styles.sqlKeyword}>SELECT</span> id, username, role{`\n`}
              <span className={styles.sqlKeyword}>FROM</span> users{`\n`}
              <span className={styles.sqlKeyword}>WHERE</span> username ={' '}
              <mark>&apos;&apos; OR 1=1 -- &apos;</mark>
            </code>
          </pre>
        </div>
        <div className={styles.results}>
          <span className={styles.panelLabel}>
            RESULT <b>3 ROWS</b>
          </span>
          <p>
            <i>1</i>
            <code>admin</code>
            <code>admin</code>
          </p>
          <p>
            <i>2</i>
            <code>alice</code>
            <code>user</code>
          </p>
          <p>
            <i>3</i>
            <code>bob</code>
            <code>user</code>
          </p>
        </div>
      </div>

      <div className={styles.defenseStatus}>
        <span aria-hidden="true">
          <IconCheck size={18} />
        </span>
        <p>
          <b>DEFENSE AVAILABLE</b>
          <small>Switch to a parameterized query and the attack stops.</small>
        </p>
        <strong>0 ROWS</strong>
      </div>
    </article>
  )
}

function Hero({
  locale,
  hero,
  how,
  loop,
}: {
  locale: Locale
  hero: ReturnType<typeof buildHomeContent>['copy']['hero']
  how: ReturnType<typeof buildHomeContent>['copy']['how']
  loop: ReturnType<typeof buildHomeContent>['loop']
}) {
  const [firstWord, ...rest] = hero.title.split(/\s+/)

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.heroImage} aria-hidden="true" />
      <div className={styles.heroScan} aria-hidden="true" />

      <div className={styles.heroContent}>
        <Eyebrow>{hero.eyebrow}</Eyebrow>
        <h1 id="hero-title" className={styles.heroTitle}>
          <span className={styles.heroTitleLine}>
            <span>{firstWord}</span>
            <Logo className={styles.heroMark} />
          </span>
          <strong>{rest.join(' ')}</strong>
        </h1>
        <p className={styles.heroTagline}>{hero.tagline}</p>
        <p className={styles.heroLede}>{hero.lede}</p>
        <div className={styles.actions}>
          <Link
            href={localeHref('/cases/the-front-door', locale)}
            className={styles.primaryButton}
            data-magnetic
          >
            {hero.primaryCta} <IconArrowRight size={19} />
          </Link>
          <a href="#method" className={styles.textLink}>
            <span aria-hidden="true">▶</span> {hero.secondaryCta}
          </a>
        </div>
      </div>

      <LiveFirePanel />

      <div id="method" className={styles.heroMethod} data-reveal>
        <Eyebrow>{how.eyebrow}</Eyebrow>
        <ol>
          {loop.map((step, index) => (
            <li key={step.title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <b>{step.title}</b>
              <p>{step.blurb}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Ticker({ items }: { items: ReturnType<typeof buildHomeContent>['ticker'] }) {
  return (
    <div className={styles.ticker} aria-hidden="true">
      <div className={styles.tickerTrack}>
        {buildTickerTrack(items).map((item, index) => (
          <span
            key={`${item.kind}-${index}`}
            className={`${styles.tickerItem} ${
              item.kind === 'payload' ? styles.tickerPayload : styles.tickerLine
            }`}
          >
            {item.text}
          </span>
        ))}
      </div>
    </div>
  )
}

function CaseCard({ caseFile, locale }: { caseFile: HomeCase; locale: Locale }) {
  const artwork = artworkForCase(caseFile.id)
  const titleId = `home-case-${caseFile.id}`

  return (
    <Link
      href={localeHref(`/cases/${caseFile.id}`, locale)}
      className={styles.caseCard}
      aria-labelledby={titleId}
      data-magnetic
      data-reveal
    >
      <div className={styles.caseArt}>
        {artwork ? (
          <Image
            src={artwork}
            alt=""
            width={1536}
            height={1024}
            unoptimized
            sizes="(max-width: 800px) 100vw, 33vw"
          />
        ) : null}
        <span aria-hidden="true">{caseFile.number}</span>
      </div>
      <p className={styles.caseMeta}>
        {caseFile.difficulty} / {caseFile.objectiveCount} {caseFile.objectiveLabel}
      </p>
      <h3 id={titleId}>{caseFile.title}</h3>
      <p className={styles.caseDescription}>{caseFile.description}</p>
      <span className={styles.caseTechniques}>{caseFile.techniques.join(' · ')}</span>
      <b className={styles.caseOpen}>
        {caseFile.cta} <span aria-hidden="true">→</span>
      </b>
    </Link>
  )
}

function CaseDeck({
  locale,
  cases,
  copy,
}: {
  locale: Locale
  cases: readonly HomeCase[]
  copy: ReturnType<typeof buildHomeContent>['copy']['cases']
}) {
  return (
    <section className={styles.caseDeck} aria-labelledby="cases-title">
      <header className={styles.sectionHeader} data-reveal>
        <div>
          <Eyebrow>{copy.eyebrow}</Eyebrow>
          <h2 id="cases-title">{copy.title}</h2>
        </div>
        <p>{copy.lede}</p>
      </header>
      <div className={styles.caseCards} data-reveal-group>
        {cases.map((caseFile) => (
          <CaseCard key={caseFile.id} caseFile={caseFile} locale={locale} />
        ))}
      </div>
    </section>
  )
}

function QueryCompare({ copy }: { copy: ReturnType<typeof buildHomeContent>['copy']['proof'] }) {
  return (
    <div className={styles.queryCompare} data-reveal="right">
      <article className={styles.vulnerable}>
        <header>
          <b>{copy.vulnerableTitle}</b>
          <span>{copy.vulnerableRisk}</span>
        </header>
        <pre>
          <code>
            <span className={styles.codeComment}>{'// Input is inserted into source'}</span>
            {`\n`}const q ={' '}
            <span className={styles.codeString}>&quot;SELECT id, username, role</span>
            {`\n  `}
            <span className={styles.codeString}>
              FROM users WHERE username = &apos;&quot;
            </span> + <mark>input</mark> +{' '}
            <span className={styles.codeString}>&quot;&apos;&quot;</span>;
          </code>
        </pre>
        <span className={styles.fieldLabel}>{copy.userInput}</span>
        <code className={styles.field}>&apos; OR 1=1 --</code>
        <div className={styles.compareNote}>
          <span aria-hidden="true">!</span>
          <p>{copy.vulnerableNote}</p>
        </div>
      </article>

      <article className={styles.secure}>
        <header>
          <b>{copy.secureTitle}</b>
          <span>{copy.secureSafe}</span>
        </header>
        <pre>
          <code>
            <span className={styles.codeComment}>{'// Structure and value stay separate'}</span>
            {`\n`}const q ={' '}
            <span className={styles.codeString}>&quot;SELECT id, username, role</span>
            {`\n  `}
            <span className={styles.codeString}>FROM users WHERE username = </span>
            <mark>?</mark>
            <span className={styles.codeString}>&quot;</span>;{`\n`}db.execute(q, [input]);
          </code>
        </pre>
        <span className={styles.fieldLabel}>{copy.boundInput}</span>
        <code className={styles.field}>[&quot;&apos; OR 1=1 --&quot;]</code>
        <div className={styles.compareNote}>
          <IconCheck size={18} />
          <p>{copy.secureNote}</p>
        </div>
      </article>
    </div>
  )
}

function DatabaseProof({
  what,
  proof,
  verification,
}: {
  what: ReturnType<typeof buildHomeContent>['copy']['what']
  proof: ReturnType<typeof buildHomeContent>['copy']['proof']
  verification: ReturnType<typeof buildHomeContent>['verification']
}) {
  return (
    <section className={styles.databaseProof} aria-labelledby="proof-title">
      <header className={styles.proofCopy} data-reveal>
        <div className={styles.proofHeading}>
          <Eyebrow>{what.eyebrow}</Eyebrow>
          <h2 id="proof-title">
            {what.title} <span>{what.titleAccent}</span>
          </h2>
        </div>
        <div className={styles.proofSide}>
          <p>{what.lede}</p>
          <ul className={styles.safetyFeatures}>
            {what.facts.map((fact, index) => (
              <li key={fact.k}>
                <b aria-hidden="true">{String(index + 1).padStart(2, '0')}</b>
                <div>
                  <strong>{fact.k}</strong>
                  <span>{fact.v}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </header>

      <div className={styles.safeBanner} data-reveal>
        <IconCheck size={19} />
        <b>{what.safe}</b>
        <p>{what.safeDetail}</p>
      </div>

      <div className={styles.databaseVisual} data-reveal="scale">
        <DataFlowSchematic />
      </div>

      <QueryCompare copy={proof} />

      <ol className={styles.verification} data-reveal-group>
        {verification.map((step, index) => (
          <li key={step.title} data-reveal>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <b>{step.title}</b>
            <p>{step.blurb}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function FaqSection({
  locale,
  copy,
  teasers,
}: {
  locale: Locale
  copy: ReturnType<typeof buildHomeContent>['copy']['faq']
  teasers: ReturnType<typeof buildHomeContent>['faqTeasers']
}) {
  return (
    <section className={styles.safetyFaq} aria-labelledby="faq-title">
      <header className={styles.faqCopy} data-reveal="left">
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <h2 id="faq-title">{copy.title}</h2>
        <p>{copy.lede}</p>
        <Link href={localeHref('/faq', locale)} className={styles.faqMore}>
          {copy.more} <IconArrowRight size={17} />
        </Link>
      </header>

      <div className={styles.faqStack} data-reveal-group>
        {teasers.map((item, index) => (
          <details key={item.q} open={index === 0} data-reveal>
            <summary>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <b>{item.q}</b>
            </summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

function LaunchCard({
  locale,
  copy,
}: {
  locale: Locale
  copy: ReturnType<typeof buildHomeContent>['copy']['closer']
}) {
  return (
    <section className={styles.launchCard} aria-labelledby="launch-title" data-reveal="scale">
      <div>
        <Eyebrow>
          {copy.fixerName} · {copy.fixerLine}
        </Eyebrow>
        <h2 id="launch-title">{copy.title}</h2>
        <Link
          href={localeHref('/cases/the-front-door', locale)}
          className={styles.primaryButton}
          data-magnetic
        >
          {copy.cta} <IconArrowRight size={19} />
        </Link>
      </div>
      <div className={styles.launchVault} aria-hidden="true" />
    </section>
  )
}

export function CinematicHomeBody({ locale }: { locale: Locale }) {
  const { copy, ticker, loop, cases, verification, faqTeasers } = buildHomeContent(locale)

  return (
    <main className={styles.page} data-home-design="cinematic-breach">
      <JsonLd data={websiteLd} />
      <JsonLd data={softwareLd} />
      <Hero locale={locale} hero={copy.hero} how={copy.how} loop={loop} />
      <Ticker items={ticker} />
      <CaseDeck locale={locale} cases={cases} copy={copy.cases} />
      <DatabaseProof what={copy.what} proof={copy.proof} verification={verification} />
      <FaqSection locale={locale} copy={copy.faq} teasers={faqTeasers} />
      <LaunchCard locale={locale} copy={copy.closer} />
    </main>
  )
}
