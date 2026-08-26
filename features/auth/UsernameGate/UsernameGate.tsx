'use client'

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import { useAuth } from '../useAuth'
import { createMyProfile } from '../authClient'
import { normalizeUsername, validateUsername } from '../validation'
import { useUsernameAvailability } from '../useUsernameAvailability'
import styles from './UsernameGate.module.css'

interface PendingProfileClaim {
  userId: string
  promise: ReturnType<typeof createMyProfile>
}

// First-confirmed-sign-in gate: an authed user with NO profiles row must claim a
// username before anything else is public. Mounted once in app/layout.tsx; it
// renders nothing unless the profile lookup settled on "no row". Not dismissable
// (the row is the account's public identity) — sign-out is the escape hatch.
export function UsernameGate() {
  const { t } = useTranslation()
  const { status, user, profile, profileReady, adoptProfile, signOut } = useAuth()

  const [username, setUsername] = useState('')
  const [manualReadyFor, setManualReadyFor] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [submitTaken, setSubmitTaken] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const inFlight = useRef(false)
  const pendingClaim = useRef<PendingProfileClaim | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const needsProfile = status === 'authed' && profileReady && !profile && user !== null
  const open = needsProfile && manualReadyFor === user?.id
  const userId = user?.id ?? null
  const signupUsername =
    typeof user?.user_metadata?.username === 'string' ? user.user_metadata.username : ''

  const liveAvailability = useUsernameAvailability(username, open)
  // A submit-time 23505 wins until the input changes again.
  const availability = submitTaken ? 'taken' : liveAvailability

  useEffect(() => {
    if (!needsProfile || !userId) return
    setManualReadyFor(null)
    setFieldError(null)
    setSubmitTaken(false)

    const candidate = normalizeUsername(signupUsername)
    setUsername(candidate)
    if (validateUsername(candidate)) {
      inFlight.current = false
      setSubmitting(false)
      setManualReadyFor(userId)
      return
    }

    let claim = pendingClaim.current
    if (!claim || claim.userId !== userId) {
      claim = { userId, promise: createMyProfile(userId, candidate) }
      pendingClaim.current = claim
    }

    let active = true
    inFlight.current = true
    setSubmitting(true)
    void claim.promise.then(({ error, row }) => {
      if (!active) return
      if (pendingClaim.current === claim) pendingClaim.current = null
      inFlight.current = false
      setSubmitting(false)
      if (row) {
        adoptProfile(row)
        return
      }
      if (error === 'username-taken') setSubmitTaken(true)
      else setFieldError(error ? `auth.errors.${error}` : 'auth.errors.generic')
      setManualReadyFor(userId)
    })

    return () => {
      active = false
    }
  }, [needsProfile, userId, signupUsername, adoptProfile])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  if (!open || !user) return null

  // Keep Tab / Shift+Tab inside the dialog (aria-modal alone doesn't stop focus
  // escaping to the page behind — mirrors HintTray's trap; WCAG 2.4.3 / 2.1.2).
  const trapTab = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input, [href], [tabindex]:not([tabindex="-1"])',
    )
    if (!focusables || focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (inFlight.current) return
    const candidate = normalizeUsername(username)
    const invalid = validateUsername(candidate)
    setFieldError(invalid)
    if (invalid) return
    inFlight.current = true
    setSubmitting(true)
    const { error, row } = await createMyProfile(user.id, candidate)
    inFlight.current = false
    setSubmitting(false)
    if (row) {
      adoptProfile(row) // gate's `open` flips false — no re-read to fail
      return
    }
    if (error === 'username-taken') {
      setSubmitTaken(true)
      return
    }
    setFieldError(`auth.errors.${error}`)
  }

  const statusLine = fieldError
    ? t(fieldError)
    : availability === 'checking'
      ? t('auth.gate.checking')
      : availability === 'available'
        ? t('auth.gate.available')
        : availability === 'taken'
          ? t('auth.gate.taken')
          : t('auth.gate.usernameHint')

  return (
    <div className={styles.overlay}>
      <section
        ref={dialogRef}
        className={`panel ${styles.card}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="username-gate-title"
        aria-describedby="username-gate-desc"
        onKeyDown={trapTab}
      >
        <p className="stamp">{t('auth.gate.stamp')}</p>
        <h2 id="username-gate-title" className={styles.title}>
          {t('auth.gate.title')}
        </h2>
        <p id="username-gate-desc" className={styles.desc}>
          {t('auth.gate.desc')}
        </p>

        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <label className={styles.label} htmlFor="gate-username">
            {t('auth.gate.username')}
          </label>
          <input
            ref={inputRef}
            id="gate-username"
            className={styles.input}
            type="text"
            autoComplete="username"
            spellCheck={false}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
              setFieldError(null)
              setSubmitTaken(false)
            }}
            aria-invalid={fieldError || availability === 'taken' ? true : undefined}
            aria-describedby="gate-username-status"
          />
          <p
            id="gate-username-status"
            className={fieldError || availability === 'taken' ? styles.statusError : styles.status}
            role="status"
            aria-live="polite"
          >
            {statusLine}
          </p>
          <button
            type="submit"
            className="btn btn--primary btn--full"
            disabled={submitting || availability === 'taken'}
            aria-busy={submitting}
          >
            {submitting ? t('auth.gate.submitting') : t('auth.gate.submit')}
          </button>
        </form>

        <button type="button" className={styles.escape} onClick={() => void signOut()}>
          {t('auth.gate.signOut')}
        </button>
      </section>
    </div>
  )
}
