'use client'

import { useMemo, type KeyboardEvent } from 'react'
import type { Objective } from '@/lib/schema/case'
import type { RunResult } from '@/lib/engine/sqlRunner'
import type { RunSignal } from '@/lib/engine/signal'
import { compose } from '@/lib/engine/queryComposer'
import type { EngineStatus } from '../../lib/useCaseEngine'
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
import { IconArrowRight } from '../icons'
import styles from './CasePlayer.module.css'

// The active objective's exploit surface — the case twin of ExploitConsole's core
// (docs/04-frontend-ux.md §5), rebuilt from the same FROZEN leaf components so it
// stays engine-truth, not regex. Split model unchanged: THE FRONT (mimic app the
// victim sees) ↔ THE WIRE (the real composed SQL + the technique-adaptive readout).
// Differences from the jobs' ExploitConsole, both deliberate:
//   • no objective line here — the ObjectiveBanner above owns goal/why/done-when;
//   • recon NOTEBOOK + RECAP are hoisted to a shared 6/6 row in CasePlayer.
interface ObjectiveConsoleProps {
  caseId: string
  appName: string
  objective: Objective
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
  caseId,
  appName,
  objective,
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
  const url = useMemo(
    () => mimicUrl(caseId, appName, objective.surface),
    [caseId, appName, objective.surface],
  )
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
      <div className={styles.split}>
        {/* ---- THE FRONT ---- */}
        <div className={styles.front}>
          <Stamp className={styles.side}>{t('game.exploit.front')}</Stamp>
          <BrowserChrome url={url} title={appName}>
            <MimicSurface
              caseId={caseId}
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
              <SignalPanel
                signal={signal}
                result={lastResult}
                winCondition={objective.winCondition}
              />
            </div>
          </EngineLoader>
        </div>
      </div>
    </section>
  )
}
