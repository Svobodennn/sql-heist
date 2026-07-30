'use client'

import type { RunSignal } from '@/lib/engine/signal'
import type { RunResult } from '@/lib/engine/levelSession'
import type { WinCondition } from '@/lib/schema/level'
import {
  errorView,
  oracleView,
  sideEffectView,
  timingView,
  type SignalTone,
} from '../lib/signalView'
import { cx } from '../lib/cx'
import { useTranslation } from '@/i18n/useTranslation'
import { ResultGrid } from './ResultGrid'
import { IconAlert, IconCheck, IconStack, IconTimer, IconX } from './icons'
import styles from './SignalPanel.module.css'

// THE WIRE's technique-adaptive readout (docs/ws3-design.md "UI scope"). Switches
// its render on RunSignal.kind — the classic `rows` grid is untouched (the frozen
// ResultGrid handles loot/error/empty for the 3 MVP jobs), while the four WS3 win
// types each get a purpose-built panel. deriveSignal is the frozen engine's PURE
// interpretation; every derived display value comes from ../lib/signalView, so
// this file is a thin presentational switch. Semantic Color Law: tone always ships
// with an icon + a word (§1, WCAG 1.4.1 — never color-only). All player-derived
// text (error message, leaked token) renders as React-escaped text nodes.

const TONE_CLASS: Record<SignalTone, string> = {
  defense: styles.toneDefense,
  attack: styles.toneAttack,
  info: styles.toneInfo,
  neutral: styles.toneNeutral,
}

interface SignalPanelProps {
  signal: RunSignal | null
  result: RunResult | null
  winCondition: WinCondition
  loading?: boolean
}

export function SignalPanel({ signal, result, winCondition, loading }: SignalPanelProps) {
  // No run yet, or a classic rows level: the frozen grid owns empty/error/loot.
  if (!signal || signal.kind === 'rows') {
    return <ResultGrid result={result} winCondition={winCondition} loading={loading} />
  }

  switch (signal.kind) {
    case 'oracle':
      return <OracleReadout signal={signal} />
    case 'timing':
      return <TimingMeter signal={signal} />
    case 'error':
      return <ErrorLeak signal={signal} />
    case 'side-effect':
      return <SideEffectReadout signal={signal} />
  }
}

function OracleReadout({ signal }: { signal: Extract<RunSignal, { kind: 'oracle' }> }) {
  const v = oracleView(signal)
  return (
    <div
      className={cx(styles.panel, styles.oracle, TONE_CLASS[v.tone])}
      role="group"
      aria-label={v.ariaLabel}
    >
      <p className={styles.oracleWord}>
        {v.value ? <IconCheck size={28} /> : <IconX size={28} />}
        <span aria-hidden="true">{v.word}</span>
      </p>
      <p className={styles.basis}>{v.basis}</p>
    </div>
  )
}

function TimingMeter({ signal }: { signal: Extract<RunSignal, { kind: 'timing' }> }) {
  const { t } = useTranslation()
  const v = timingView(signal)
  return (
    <div
      className={cx(styles.panel, TONE_CLASS[v.tone])}
      role="group"
      aria-label={v.ariaLabel}
    >
      <p className={styles.head}>
        <IconTimer size={16} />
        <span>{t('game.signal.timingOracle')}</span>
        <span className={cx('mono', styles.headValue)}>
          {v.delayMs} ms · {v.word}
        </span>
      </p>
      {/* fast <-> slow track; the fill scales on the GPU, the marker pins the
          modeled threshold. aria-hidden — the region's aria-label already speaks. */}
      <div
        className={styles.meter}
        aria-hidden="true"
        style={{ ['--marker' as string]: `${v.thresholdPct}%` }}
      >
        <div className={styles.meterFill} style={{ transform: `scaleX(${v.fillPct / 100})` }} />
        <span className={styles.meterMarker} />
      </div>
      <p className={styles.meterScale} aria-hidden="true">
        <span>{t('game.signal.fast')}</span>
        <span className="mono">{t('game.signal.threshold', { n: v.threshold })}</span>
        <span>{t('game.signal.slow')}</span>
      </p>
    </div>
  )
}

function ErrorLeak({ signal }: { signal: Extract<RunSignal, { kind: 'error' }> }) {
  const { t } = useTranslation()
  const v = errorView(signal)
  return (
    <div
      className={cx(styles.panel, styles.error, TONE_CLASS[v.tone])}
      role="group"
      aria-label={v.ariaLabel}
    >
      <p className={styles.head}>
        <IconAlert size={16} />
        <span>{t('game.signal.errorLeak')}</span>
        {v.leaked && <span className={styles.leakTag}>{t('game.signal.structureExposed')}</span>}
      </p>
      <pre className={cx('mono', styles.errorMsg)}>
        {v.spans.map((span, i) =>
          span.leaked ? (
            <mark key={i} className={styles.leaked}>
              {span.text}
            </mark>
          ) : (
            <span key={i}>{span.text}</span>
          ),
        )}
      </pre>
      <p className={styles.gloss}>
        {v.leaked ? t('game.signal.errorLeakedGloss') : t('game.signal.errorGloss')}
      </p>
    </div>
  )
}

function SideEffectReadout({ signal }: { signal: Extract<RunSignal, { kind: 'side-effect' }> }) {
  const { t } = useTranslation()
  const v = sideEffectView(signal)
  return (
    <div
      className={cx(styles.panel, TONE_CLASS[v.tone])}
      role="group"
      aria-label={v.ariaLabel}
    >
      <p className={styles.head}>
        <IconStack size={16} />
        <span>{t('game.signal.sideEffect')}</span>
        <span className={cx('mono', styles.headValue)}>
          {v.statements} statement{v.statements === 1 ? '' : 's'}
        </span>
      </p>
      <p className={styles.summary}>{v.summary}</p>
    </div>
  )
}
