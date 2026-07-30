'use client'

import Link from 'next/link'
import type { Phase } from '../../lib/phaseMachine'
import { cx } from '../../lib/cx'
import { useTranslation } from '@/i18n/useTranslation'
import { IconArrowLeft, IconBoard, IconMute, IconStar, IconTimer, IconVolume } from '../icons'
import { PhaseStepper } from '../PhaseStepper'
import styles from './TopBar.module.css'

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface TopBarProps {
  jobTitle: string
  phase: Phase
  elapsedSec: number
  score: number | null
  muted: boolean
  onToggleMute: () => void
  canBack: boolean
  backLabel: string | null
  onBack: () => void
}

// Sticky global chrome (docs/04-frontend-ux.md §2). Timer only "runs" (brass)
// during exploit — reading the brief is never penalized. Hosts the two WS1
// controls: leave to The Board (full exit) and step back a phase (session-
// preserving — no engine reset).
export function TopBar({
  jobTitle,
  phase,
  elapsedSec,
  score,
  muted,
  onToggleMute,
  canBack,
  backLabel,
  onBack,
}: TopBarProps) {
  const { t } = useTranslation()
  const timerActive = phase === 'exploit'

  return (
    <header className={styles.bar}>
      <div className={cx('container', styles.inner)}>
        <div className={styles.left}>
          <Link href="/jobs" className={styles.iconBtn} aria-label={t('game.topbar.leave')}>
            <IconBoard size={18} />
          </Link>
          {canBack && backLabel && (
            <button
              type="button"
              className={styles.iconBtn}
              aria-label={t('game.topbar.back', { label: backLabel })}
              onClick={onBack}
            >
              <IconArrowLeft size={18} />
            </button>
          )}
          <span className={styles.crumb}>
            {jobTitle} · <span className={styles.phaseName}>{phase}</span>
          </span>
        </div>

        <div className={styles.center}>
          <PhaseStepper phase={phase} />
        </div>

        <div className={styles.right}>
          <span
            className={cx(styles.timer, timerActive && styles.timerActive)}
            aria-label={t('game.topbar.time', { time: formatTime(elapsedSec) })}
          >
            <IconTimer size={15} />
            <span className="mono">{formatTime(elapsedSec)}</span>
          </span>

          {score != null && (
            <span className={styles.score} aria-label={t('game.topbar.score', { score })}>
              <IconStar size={15} filled />
              <span className="mono">{score}</span>
            </span>
          )}

          <button
            type="button"
            className={styles.iconBtn}
            aria-pressed={muted}
            aria-label={muted ? t('game.topbar.unmute') : t('game.topbar.mute')}
            onClick={onToggleMute}
          >
            {muted ? <IconMute size={18} /> : <IconVolume size={18} />}
          </button>
        </div>
      </div>
    </header>
  )
}
