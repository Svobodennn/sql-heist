'use client'

import Link from 'next/link'
import { useRef, useState, type FormEvent } from 'react'
import { localeHref } from '@/i18n/localeHref'
import { useTranslation } from '@/i18n/useTranslation'
import { useAuth } from '../useAuth'
import { rememberPendingEmail, resendSignupEmail, type AuthErrorCode } from '../authClient'
import {
  normalizeEmail,
  normalizeUsername,
  validateEmail,
  validatePassword,
  validateUsername,
} from '../validation'
import { AuthCard } from '../AuthCard'
import { OAuthButtons } from '../OAuthButtons'
import styles from './SignUpForm.module.css'

export function SignUpForm() {
  const { locale, t } = useTranslation()
  const { status, signUpEmail } = useAuth()

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fieldError, setFieldError] = useState<{
    email?: string
    username?: string
    password?: string
  }>({})
  const [formError, setFormError] = useState<AuthErrorCode | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [resend, setResend] = useState<{
    pending: boolean
    done: boolean
    error: AuthErrorCode | null
  }>({ pending: false, done: false, error: null })
  const inFlight = useRef(false)

  if (status === 'disabled') {
    return (
      <AuthCard stamp={t('auth.signUp.stamp')} title={t('auth.signUp.title')}>
        <p className={styles.muted}>{t('auth.errors.auth-disabled')}</p>
      </AuthCard>
    )
  }

  const doResend = async (email: string) => {
    if (resend.pending) return
    setResend({ pending: true, done: false, error: null })
    const { error } = await resendSignupEmail(email)
    setResend({ pending: false, done: !error, error: error ?? null })
  }

  if (sentTo) {
    return (
      <AuthCard
        stamp={t('auth.signUp.stamp')}
        title={t('auth.signUp.checkInboxTitle')}
        footer={
          <>
            <span>{t('auth.signUp.haveAccount')}</span>
            <Link href={localeHref('/auth/sign-in', locale)}>{t('auth.signUp.goSignIn')}</Link>
          </>
        }
      >
        <p className={styles.muted}>{t('auth.signUp.checkInbox', { email: sentTo })}</p>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={resend.pending}
          onClick={() => void doResend(sentTo)}
        >
          {t('auth.signUp.resend')}
        </button>
        <p className={styles.resendStatus} role="status" aria-live="polite">
          {resend.error
            ? t(`auth.errors.${resend.error}`)
            : resend.done
              ? t('auth.signUp.resent')
              : ''}
        </p>
      </AuthCard>
    )
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (inFlight.current) return
    const cleanEmail = normalizeEmail(email)
    const cleanUsername = normalizeUsername(username)
    const errors = {
      email: validateEmail(cleanEmail) ?? undefined,
      username: validateUsername(cleanUsername) ?? undefined,
      password: validatePassword(password) ?? undefined,
    }
    setFieldError(errors)
    setFormError(null)
    if (errors.email || errors.username || errors.password) return
    inFlight.current = true
    setSubmitting(true)
    const { error } = await signUpEmail(cleanEmail, password, cleanUsername)
    inFlight.current = false
    setSubmitting(false)
    if (error) {
      setFormError(error)
      return
    }
    rememberPendingEmail(cleanEmail)
    setSentTo(cleanEmail)
  }

  return (
    <AuthCard
      stamp={t('auth.signUp.stamp')}
      title={t('auth.signUp.title')}
      footer={
        <>
          <span>{t('auth.signUp.haveAccount')}</span>
          <Link href={localeHref('/auth/sign-in', locale)}>{t('auth.signUp.goSignIn')}</Link>
        </>
      }
    >
      <OAuthButtons returnTo={localeHref('/', locale)} />
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {formError && (
          <div className={styles.alert} role="alert">
            <p>{t(`auth.errors.${formError}`)}</p>
            {formError === 'user-exists' && (
              <Link className={styles.alertAction} href={localeHref('/auth/sign-in', locale)}>
                {t('auth.signUp.goSignIn')}
              </Link>
            )}
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="signup-email">
            {t('auth.signUp.email')}
          </label>
          <input
            id="signup-email"
            className={styles.input}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={fieldError.email ? true : undefined}
            aria-describedby="signup-email-hint"
          />
          <p id="signup-email-hint" className={styles.hint}>
            {fieldError.email && <span className={styles.fieldError}>{t(fieldError.email)}</span>}
          </p>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="signup-username">
            {t('auth.signUp.username')}
          </label>
          <input
            id="signup-username"
            className={styles.input}
            type="text"
            autoComplete="username"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-invalid={fieldError.username ? true : undefined}
            aria-describedby="signup-username-hint"
          />
          <p id="signup-username-hint" className={styles.hint} role="status" aria-live="polite">
            {fieldError.username ? (
              <span className={styles.fieldError}>{t(fieldError.username)}</span>
            ) : (
              t('auth.signUp.usernameHint')
            )}
          </p>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="signup-password">
            {t('auth.signUp.password')}
          </label>
          <input
            id="signup-password"
            className={styles.input}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={fieldError.password ? true : undefined}
            aria-describedby="signup-password-hint"
          />
          <p id="signup-password-hint" className={styles.hint}>
            {fieldError.password ? (
              <span className={styles.fieldError}>{t(fieldError.password)}</span>
            ) : (
              t('auth.signUp.passwordHint')
            )}
          </p>
        </div>

        <p className={styles.legalNotice}>
          {t('auth.signUp.privacyNotice')}{' '}
          <Link href={localeHref('/privacy', locale)}>{t('auth.signUp.privacyLink')}</Link>.{' '}
          {t('auth.signUp.termsNotice')}{' '}
          <Link href={localeHref('/terms', locale)}>{t('auth.signUp.termsLink')}</Link>.
        </p>

        <button
          type="submit"
          className="btn btn--primary btn--full"
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? t('auth.signUp.submitting') : t('auth.signUp.submit')}
        </button>
      </form>
    </AuthCard>
  )
}
