'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState, type FormEvent } from 'react'
import { localeHref } from '@/i18n/localeHref'
import { useTranslation } from '@/i18n/useTranslation'
import { useAuth } from '../useAuth'
import { resendSignupEmail, type AuthErrorCode } from '../authClient'
import { EMAIL_MAX_LENGTH, normalizeEmail, validateEmail } from '../validation'
import { AuthCard } from '../AuthCard'
import { OAuthButtons } from '../OAuthButtons'
import styles from './SignInForm.module.css'

export function SignInForm() {
  const { locale, t } = useTranslation()
  const { status, signInEmail } = useAuth()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldError, setFieldError] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState<AuthErrorCode | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // The email that triggered email-not-confirmed — resend targets THIS, not
  // whatever is in the field now (the user may have edited it since).
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null)
  const [resend, setResend] = useState<{
    pending: boolean
    done: boolean
    error: AuthErrorCode | null
  }>({ pending: false, done: false, error: null })
  const inFlight = useRef(false)

  if (status === 'disabled') {
    return (
      <AuthCard stamp={t('auth.signIn.stamp')} title={t('auth.signIn.title')}>
        <p className={styles.muted}>{t('auth.errors.auth-disabled')}</p>
      </AuthCard>
    )
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (inFlight.current) return
    const cleanEmail = normalizeEmail(email)
    const errors = {
      email: validateEmail(cleanEmail) ?? undefined,
      password: password ? undefined : 'auth.validation.password',
    }
    setFieldError(errors)
    setFormError(null)
    setResend({ pending: false, done: false, error: null })
    if (errors.email || errors.password) return
    inFlight.current = true
    setSubmitting(true)
    const { error } = await signInEmail(cleanEmail, password)
    inFlight.current = false
    setSubmitting(false)
    if (error) {
      setFormError(error)
      setUnconfirmedEmail(error === 'email-not-confirmed' ? cleanEmail : null)
      return
    }
    router.push(localeHref('/', locale))
  }

  const doResend = async () => {
    if (!unconfirmedEmail || resend.pending) return
    setResend({ pending: true, done: false, error: null })
    const { error } = await resendSignupEmail(unconfirmedEmail)
    setResend({ pending: false, done: !error, error: error ?? null })
  }

  return (
    <AuthCard
      stamp={t('auth.signIn.stamp')}
      title={t('auth.signIn.title')}
      footer={
        <>
          <span>{t('auth.signIn.noAccount')}</span>
          <Link href={localeHref('/auth/sign-up', locale)}>{t('auth.signIn.goSignUp')}</Link>
        </>
      }
    >
      <OAuthButtons returnTo={localeHref('/', locale)} />
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        {formError && (
          <div className={styles.alert} role="alert">
            <p>{t(`auth.errors.${formError}`)}</p>
            {formError === 'email-not-confirmed' && (
              <>
                <button
                  type="button"
                  className={styles.alertAction}
                  disabled={resend.pending}
                  onClick={() => void doResend()}
                >
                  {t('auth.signIn.resend')}
                </button>
                <span role="status" aria-live="polite">
                  {resend.error
                    ? t(`auth.errors.${resend.error}`)
                    : resend.done
                      ? t('auth.signIn.resent')
                      : ''}
                </span>
              </>
            )}
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="signin-email">
            {t('auth.signIn.email')}
          </label>
          <input
            id="signin-email"
            className={styles.input}
            type="email"
            autoComplete="email"
            maxLength={EMAIL_MAX_LENGTH}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={fieldError.email ? true : undefined}
            aria-describedby={fieldError.email ? 'signin-email-error' : undefined}
          />
          {fieldError.email && (
            <p id="signin-email-error" className={styles.fieldError}>
              {t(fieldError.email)}
            </p>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="signin-password">
            {t('auth.signIn.password')}
          </label>
          <input
            id="signin-password"
            className={styles.input}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={fieldError.password ? true : undefined}
            aria-describedby={fieldError.password ? 'signin-password-error' : undefined}
          />
          {fieldError.password && (
            <p id="signin-password-error" className={styles.fieldError}>
              {t(fieldError.password)}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="btn btn--primary btn--full"
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? t('auth.signIn.submitting') : t('auth.signIn.submit')}
        </button>
      </form>
    </AuthCard>
  )
}
