'use client'

import { useEffect, useRef, useState } from 'react'
import { IconTimer } from '../icons'
import styles from './CaseTimer.module.css'

function format(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Time-on-the-job readout for the case player (restored — the old jobs TopBar had a
// clock; the case player had dropped it). Accumulates elapsed time while `running`,
// freezes when paused, and zeroes whenever `resetKey` changes (a replay). Client-only
// and purely presentational — it never feeds score. Mounted only once play has begun,
// so there is no server/client "00:00" hydration seam.
export function CaseTimer({ running, resetKey }: { running: boolean; resetKey: number }) {
  const [ms, setMs] = useState(0)
  const accRef = useRef(0)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    accRef.current = 0
    startRef.current = null
    setMs(0)
  }, [resetKey])

  useEffect(() => {
    if (!running) return
    startRef.current = Date.now()
    const tick = () =>
      setMs(accRef.current + (startRef.current !== null ? Date.now() - startRef.current : 0))
    tick()
    const id = setInterval(tick, 1000)
    return () => {
      clearInterval(id)
      if (startRef.current !== null) {
        accRef.current += Date.now() - startRef.current
        startRef.current = null
      }
    }
  }, [running])

  const label = format(ms)
  return (
    <span className={styles.timer} aria-label={`Time on the job: ${label}`}>
      <IconTimer size={15} aria-hidden="true" />
      <span className="mono">{label}</span>
    </span>
  )
}
