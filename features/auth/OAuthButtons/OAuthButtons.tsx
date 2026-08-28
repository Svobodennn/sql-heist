'use client'

import Link from 'next/link'
import { useState } from 'react'
import { localeHref } from '@/i18n/localeHref'
import { useTranslation } from '@/i18n/useTranslation'
import { signInOAuth, type AuthErrorCode } from '../authClient'
import { OAUTH_PROVIDERS, type OAuthProvider } from '../oauthProfile'
import styles from './OAuthButtons.module.css'

interface OAuthButtonsProps {
  returnTo: string
}

export function OAuthButtons({ returnTo }: OAuthButtonsProps) {
  const { locale, t } = useTranslation()
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null)
  const [error, setError] = useState<AuthErrorCode | null>(null)

  const start = async (provider: OAuthProvider) => {
    if (pendingProvider) return
    setPendingProvider(provider)
    setError(null)
    const result = await signInOAuth(provider, { purpose: 'sign-in', returnTo })
    if (!result.error) return
    setError(result.error)
    setPendingProvider(null)
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.buttons}>
        {OAUTH_PROVIDERS.map((provider) => (
          <button
            key={provider}
            type="button"
            className={`btn btn--full ${styles.provider} ${
              provider === 'google' ? styles.google : 'btn--ghost'
            }`}
            disabled={pendingProvider !== null}
            aria-busy={pendingProvider === provider}
            onClick={() => void start(provider)}
          >
            {provider === 'google' && <span className={styles.googleMark} aria-hidden="true" />}
            {pendingProvider === provider
              ? t(`auth.oauth.loading.${provider}`)
              : t(`auth.oauth.continue.${provider}`)}
          </button>
        ))}
      </div>
      <p className={styles.linkNotice}>
        {t('auth.oauth.linkNotice')} {t('auth.oauth.privacyNotice')}{' '}
        <Link href={localeHref('/privacy', locale)}>{t('auth.oauth.privacyLink')}</Link>.{' '}
        {t('auth.oauth.termsNotice')}{' '}
        <Link href={localeHref('/terms', locale)}>{t('auth.oauth.termsLink')}</Link>.
      </p>
      {error && (
        <p className={styles.error} role="alert">
          {t(`auth.errors.${error}`)}
        </p>
      )}
      <div className={styles.divider} aria-label={t('auth.oauth.divider')}>
        <span aria-hidden="true" />
        <p>{t('auth.oauth.divider')}</p>
        <span aria-hidden="true" />
      </div>
    </div>
  )
}
