import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { ContentPage } from '@/app/components/ContentPage'
import { Callout, Section } from '@/app/components/ContentPage/content-blocks'
import { IconArrowRight } from '@/app/components/icons'
import { cx } from '@/ui/cx'
import { getServerTranslator } from '@/i18n/server'
import styles from '@/app/components/ContentPage/content.module.css'

// Help body (Server Component, no client JS). Shared by the unprefixed en route
// (app/help/page.tsx) and a future per-locale export; the `locale` prop selects
// which catalog it renders from. Every visible string lives in the i18n catalog
// under the `help` namespace — the section anchors (before/moves/…) stay in code
// as stable deep-link ids, not localized prose.

// Section anchor ids — structural deep-link targets, identical across locales.
const MOVES = ['0', '1', '2', '3', '4'] as const
const SWATCHES = [styles.swatchInj, styles.swatchKw, styles.swatchDim] as const

export function HelpBody({ locale }: { locale: Locale }) {
  const t = getServerTranslator(locale)
  return (
    <ContentPage
      eyebrow={t('help.eyebrow')}
      title={t('help.title')}
      lead={t('help.lead')}
      locale={locale}
      breadcrumbPath="/help"
    >
      <Section id="before" title={t('help.sectionBefore')}>
        <p>
          {t('help.before.introPre')}
          <strong>{t('help.before.introStrong')}</strong>
          {t('help.before.introPost')}
        </p>
        <Callout label={t('help.calloutSafe')}>
          <p>{t('help.before.calloutBody')}</p>
        </Callout>
      </Section>

      <Section id="moves" title={t('help.sectionMoves')}>
        <p>{t('help.moves.intro')}</p>
        <ol className={styles.steps}>
          {MOVES.map((i) => (
            <li key={i} className={styles.step}>
              <div className={styles.stepMarker}>
                <span className={styles.stepNum} aria-hidden="true" />
                <span className={styles.stepLine} aria-hidden="true" />
              </div>
              <div className={styles.stepBody}>
                <h3>{t(`help.moves.items.${i}.title`)}</h3>
                <p>{t(`help.moves.items.${i}.body`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="wire" title={t('help.sectionWire')}>
        <p>{t('help.wire.intro')}</p>
        <ul className={styles.legend}>
          {SWATCHES.map((swatch, i) => (
            <li key={i} className={styles.legendItem}>
              <span className={cx(styles.swatch, swatch)} aria-hidden="true" />
              <p>
                <strong>{t(`help.wire.legend.${i}.term`)}</strong>
                {t(`help.wire.legend.${i}.rest`)}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="controls" title={t('help.sectionControls')}>
        <ul className={styles.keyRows}>
          <li className={styles.keyRow}>
            <span>{t('help.controls.run.pre')}</span>
            <span className="kbd">{t('help.controls.run.cmd')}</span>
            <span>/</span>
            <span className="kbd">{t('help.controls.run.ctrl')}</span>
            <span>+</span>
            <span className="kbd">{t('help.controls.run.enter')}</span>
            <span>{t('help.controls.run.mid')}</span>
            <strong>{t('help.controls.run.button')}</strong>
            <span>{t('help.controls.run.post')}</span>
          </li>
          <li className={styles.keyRow}>
            <strong>{t('help.controls.reset.name')}</strong>
            <span>{t('help.controls.reset.text')}</span>
          </li>
          <li className={styles.keyRow}>
            <span>{t('help.controls.keys.pre')}</span>
            <span className="kbd">{t('help.controls.keys.esc')}</span>
            <span>{t('help.controls.keys.post')}</span>
          </li>
        </ul>
      </Section>

      <Section id="stuck" title={t('help.sectionStuck')}>
        <p>{t('help.stuck.body')}</p>
      </Section>

      <Section id="point" title={t('help.sectionPoint')}>
        <p>{t('help.point.body')}</p>
        <div className={styles.ctaRow}>
          <Link href="/cases" className="btn btn--primary">
            <span>{t('help.cta')}</span>
            <IconArrowRight size={18} />
          </Link>
        </div>
      </Section>
    </ContentPage>
  )
}
