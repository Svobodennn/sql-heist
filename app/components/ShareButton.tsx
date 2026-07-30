'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from '@/app/i18n/useTranslation'
import { cx } from './cx'
import { IconShare, IconCheck, IconLink } from './icons'
import styles from './ShareButton.module.css'

type Status = 'idle' | 'copied' | 'error'

// Canonical URL for the current view: origin + pathname, query/hash stripped.
// Computed at click time (never during render) so the static export never
// touches `window` on the server — no hydration hazard.
function canonicalUrl(): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}`
}

// Clipboard write with a defensive fallback for browsers/contexts where the
// async Clipboard API is unavailable (older engines, non-secure origins).
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

// Game-LINK share (docs directive WAVE 1). Copies the canonical link to the
// current job/page. On devices with a native share sheet (typically mobile) it
// offers that first; otherwise it copies to the clipboard and confirms.
//
// TODO(WS-share/SEO): result card — a shareable "I cracked The Vault" OG image
// per completed job (dynamic OG or a static /share/[jobId] card + og:image meta).
// Deferred: needs the SEO/OG work-stream and a canonical deploy origin. This
// button ships the link-share now; the card is additive and non-blocking.
export function ShareButton({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<Status>('idle')
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(resetTimer.current), [])

  const flash = useCallback((next: Status) => {
    setStatus(next)
    clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setStatus('idle'), 2200)
  }, [])

  const onShare = useCallback(async () => {
    const url = canonicalUrl()

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: document.title, url })
        return
      } catch (err) {
        // User dismissed the native sheet — respect it, do nothing further.
        if (err instanceof DOMException && err.name === 'AbortError') return
        // Any other failure: fall back to copying the link.
      }
    }

    flash((await copyText(url)) ? 'copied' : 'error')
  }, [flash])

  const label =
    status === 'copied'
      ? t('share.copied')
      : status === 'error'
        ? t('share.error')
        : t('share.share')

  const Icon = status === 'copied' ? IconCheck : compact ? IconLink : IconShare

  return (
    <button
      type="button"
      onClick={onShare}
      className={cx(styles.btn, compact && styles.compact, status === 'copied' && styles.ok, className)}
      data-status={status}
    >
      <Icon size={18} />
      <span>{label}</span>
      {/* Announce the copy result to assistive tech without moving focus. */}
      <span className="sr-only" role="status" aria-live="polite">
        {status === 'copied' ? t('share.srCopied') : status === 'error' ? t('share.srError') : ''}
      </span>
    </button>
  )
}
