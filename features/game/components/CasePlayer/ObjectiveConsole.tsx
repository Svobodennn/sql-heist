'use client'

import { useMemo, type KeyboardEvent } from 'react'
import type { Objective } from '@/lib/schema/case'
import type { VisibleTable } from '@/lib/schema/level'
import type { RunResult } from '@/lib/engine/sqlRunner'
import type { RunSignal } from '@/lib/engine/signal'
import { compose } from '@/lib/engine/queryComposer'
import type { EngineStatus } from '../../lib/useCaseEngine'
import { cx } from '@/ui/cx'
import { useTranslation } from '@/i18n/useTranslation'
import { Button } from '../Button'
import { BrowserChrome } from '../BrowserChrome'
import { EngineLoader } from '../EngineLoader'
import { HintTray } from '../HintTray'
import { MimicSurface, mimicUrl } from '../MimicSurface'
import { SignalPanel } from '../SignalPanel'
import { SqlPreview } from '../SqlPreview'
import { Stamp } from '../Stamp'
import { WafBanner } from '../WafBanner'
import { IconArrowRight, IconChevronDown } from '../icons'
import styles from './CasePlayer.module.css'

// The active objective's exploit surface — the case twin of ExploitConsole's core
// (docs/04-frontend-ux.md §5), rebuilt from the same FROZEN leaf components so it
// stays engine-truth, not regex. Split model unchanged: THE FRONT (mimic app the
// victim sees) ↔ THE WIRE (the real composed SQL + the technique-adaptive readout).
// Differences from the jobs' ExploitConsole, both deliberate:
//   • no objective line here — the ObjectiveBanner above owns goal/why/done-when;
//   • the recon NOTEBOOK is hoisted to the CasePlayer (it spans the whole case),
//     so this console renders only the case's shared-schema recap.
interface ObjectiveConsoleProps {
  appName: string
  objective: Objective
  visibleSchema: VisibleTable[]
  inputs: Record<string, string>
  lastResult: RunResult | null
  signal: RunSignal | null
  engineStatus: EngineStatus
  openedTiers: number
  suggestHint: boolean
  onChange: (field: string, value: string) => void
  onRun: () => void
  onReset: () => void
  onRetry: () => void
  onOpenHint: (tier: number) => void
}

export function ObjectiveConsole({
  appName,
  objective,
  visibleSchema,
  inputs,
  lastResult,
  signal,
  engineStatus,
  openedTiers,
  suggestHint,
  onChange,
  onRun,
  onReset,
  onRetry,
  onOpenHint,
}: ObjectiveConsoleProps) {
  const { t } = useTranslation()
  const url = useMemo(() => mimicUrl(appName, objective.surface), [appName, objective.surface])
  // Live preview stays raw (no inputFilter) — it shows the player's literal
  // injection intent as they type; the WAF effect surfaces post-run in the banner.
  const composed = useMemo(
    () => compose(objective.query.template, inputs),
    [objective.query.template, inputs],
  )
  const canRun = engineStatus === 'ready'

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      if (canRun) onRun()
    }
  }

  return (
    <section
      className={styles.console}
      onKeyDown={handleKeyDown}
      aria-label={t('game.exploit.consoleAria')}
    >
      {/* The case's shared schema — the same recap ExploitConsole shows, but here
          it describes the ONE persistent DB every objective works against. */}
      <details className={styles.recap} open>
        <summary className={styles.recapSummary}>
          <IconChevronDown size={16} className={styles.recapChevron} />
          <span>
            {t('game.exploit.recap')} <span className="mono">{appName}</span>
          </span>
        </summary>
        <div className={styles.recapBody}>
          <p className={styles.recapHead}>{t('game.exploit.visibleSchema')}</p>
          <ul className={styles.recapTables}>
            {visibleSchema.map((tbl) => (
              <li key={tbl.table} className={styles.recapTable}>
                <span className={cx('mono', styles.recapTableName)}>{tbl.table}</span>
                <span className={styles.recapCols}>
                  {tbl.columns.map((col) => (
                    <span key={col} className={cx('mono', styles.recapCol)}>
                      {col}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </details>

      <div className={styles.split}>
        {/* ---- THE FRONT ---- */}
        <div className={styles.front}>
          <Stamp className={styles.side}>{t('game.exploit.front')}</Stamp>
          <BrowserChrome url={url}>
            <MimicSurface
              surface={objective.surface}
              appName={appName}
              fields={objective.fields}
              values={inputs}
              interactive
              onChange={onChange}
              onSubmit={() => canRun && onRun()}
            />
          </BrowserChrome>

          <HintTray
            hints={objective.hints}
            openedTiers={openedTiers}
            onOpen={onOpenHint}
            suggest={suggestHint}
          />
        </div>

        {/* ---- THE WIRE ---- */}
        <div className={styles.wire}>
          <Stamp className={styles.side}>
            {t('game.exploit.wire')}{' '}
            <span className={styles.live}>
              <span className={styles.liveDot} aria-hidden="true" /> {t('game.exploit.live')}
            </span>
          </Stamp>

          <div className={styles.sqlBox}>
            <p className={styles.sqlLabel}>{t('game.exploit.reaches')}</p>
            <SqlPreview segments={composed.segments} />
          </div>

          <EngineLoader status={engineStatus} onRetry={onRetry}>
            <div className={styles.controls}>
              <Button
                variant="primary"
                onClick={onRun}
                disabled={!canRun}
                iconRight={<IconArrowRight size={18} />}
              >
                {t('game.exploit.sendIt')}
              </Button>
              <span className={styles.kbdHint}>
                <kbd className="kbd">⌘/Ctrl</kbd>
                <kbd className="kbd">↵</kbd>
              </span>
              <Button variant="ghost" onClick={onReset}>
                {t('game.exploit.reset')}
              </Button>
            </div>

            <div className={styles.resultBox}>
              <Stamp>{t('game.exploit.cameBack')}</Stamp>
              {lastResult?.filter && <WafBanner filter={lastResult.filter} />}
              <SignalPanel signal={signal} result={lastResult} winCondition={objective.winCondition} />
            </div>
          </EngineLoader>
        </div>
      </div>
    </section>
  )
}
