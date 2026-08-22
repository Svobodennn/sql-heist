'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import { useAuth } from '../useAuth'
import {
  clearPendingEmail,
  exchangeCode,
  readPendingEmail,
  resendSignupEmail,
  verifyEmailOtp,
  type AuthErrorCode,
} from '../authClient'
import { AuthCard } from '../AuthCard'
import styles from './CallbackPanel.module.css'

// Static confirm-email landing. There is no server: supabase-js itself consumes
// the PKCE `?code=` (detectSessionInUrl) the moment the client initializes, and
// the session lands via onAuthStateChange → useAuth. This panel only OBSERVES:
// authed → redirect home (UsernameGate pops there if the profile is missing);
// stuck or error params → explain + offer resend / sign-in. The Supabase default
// email template is ConfirmationURL-based, so a cross-device open can't finish
// the PKCE exchange (no code_verifier here) — the copy covers that honestly.
export function CallbackPanel() {
  const { t } = useTranslation()
  const { status } = useAuth()
  const router = useRouter()

  const [failed, setFailed] = useState(false)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [resend, setResend] = useState<{ pending: boolean; done: boolean; error: AuthErrorCode | null }>(
    { pending: false, done: false, error: null },
  )

  // window is unavailable during prerender — read URL + storage after mount.
  useEffect(() => {
    setPendingEmail(readPendingEmail())
    const search = new URLSearchParams(window.location.search)
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    if (search.get('error') || hash.get('error') || hash.get('error_description')) setFailed(true)
    // Fallback path for `{{ .TokenHash }}` email templates (default is `?code=`
    // PKCE, handled by detectSessionInUrl; this only fires when present).
    const tokenHash = search.get('token_hash')
    if (tokenHash) void verifyEmailOtp(tokenHash).then(({ error }) => error && setFailed(true))
  }, [])

  useEffect(() => {
    if (status !== 'authed') return
    clearPendingEmail()
    router.replace('/')
  }, [status, router])

  // Belt and braces: if the automatic exchange hasn't produced a session after a
  // grace period, try once manually, then declare failure.
  useEffect(() => {
    if (status !== 'anon' || failed) return
    const timer = setTimeout(() => {
      const code = new URLSearchParams(window.location.search).get('code')
      if (!code) {
        setFailed(true)
        return
      }
      void exchangeCode(code).then(({ error }) => {
        if (error) setFailed(true)
      })
    }, 5000)
    return () => clearTimeout(timer)
  }, [status, failed])

  // Strip the one-time code/error from the URL on the failure card so it can't be
  // copied out of the address bar into a support ticket (the success path already
  // navigates away). PKCE makes the code useless off this browser, but tidy is tidy.
  useEffect(() => {
    if (failed && window.location.search) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [failed])

  const doResend = async () => {
    if (!pendingEmail || resend.pending) return
    setResend({ pending: true, done: false, error: null })
    const { error } = await resendSignupEmail(pendingEmail)
    setResend({ pending: false, done: !error, error: error ?? null })
  }

  if (status === 'disabled') {
    return (
      <AuthCard stamp={t('auth.callback.stamp')} title={t('auth.callback.errorTitle')}>
        <p className={styles.muted}>{t('auth.errors.auth-disabled')}</p>
      </AuthCard>
    )
  }

  if (failed) {
    return (
      <AuthCard
        stamp={t('auth.callback.stamp')}
        title={t('auth.callback.errorTitle')}
        footer={<Link href="/auth/sign-in">{t('auth.callback.goSignIn')}</Link>}
      >
        <p className={styles.muted}>{t('auth.callback.verifyFailed')}</p>
        {pendingEmail && (
          <>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={resend.pending}
              onClick={() => void doResend()}
            >
              {t('auth.callback.resend')}
            </button>
            <p className={styles.muted} role="status" aria-live="polite">
              {resend.error
                ? t(`auth.errors.${resend.error}`)
                : resend.done
                  ? t('auth.callback.resent')
                  : ''}
            </p>
          </>
        )}
      </AuthCard>
    )
  }

  return (
    <AuthCard stamp={t('auth.callback.stamp')} title={t('auth.callback.confirming')}>
      <p className={styles.muted} aria-live="polite">
        {t('auth.callback.hold')}
      </p>
    </AuthCard>
  )
}
