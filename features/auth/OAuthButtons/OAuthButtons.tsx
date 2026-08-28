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
            {provider === 'github' && (
              <svg
                className={styles.githubMark}
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M10.226 17.284c-2.965-.36-5.054-2.493-5.054-5.256 0-1.123.404-2.336 1.078-3.144-.292-.741-.247-2.314.09-2.965.898-.112 2.111.36 2.83 1.01.853-.269 1.752-.404 2.853-.404 1.1 0 1.999.135 2.807.382.696-.629 1.932-1.1 2.83-.988.315.606.36 2.179.067 2.942.72.854 1.101 2 1.101 3.167 0 2.763-2.089 4.852-5.098 5.234.763.494 1.28 1.572 1.28 2.807v2.336c0 .674.561 1.056 1.235.786 4.066-1.55 7.255-5.615 7.255-10.646C23.5 6.188 18.334 1 11.978 1 5.62 1 .5 6.188.5 12.545c0 4.986 3.167 9.12 7.435 10.669.606.225 1.19-.18 1.19-.786V20.63a2.9 2.9 0 0 1-1.078.224c-1.483 0-2.359-.808-2.987-2.313-.247-.607-.517-.966-1.034-1.033-.27-.023-.359-.135-.359-.27 0-.27.45-.471.898-.471.652 0 1.213.404 1.797 1.235.45.651.921.943 1.483.943.561 0 .92-.202 1.437-.719.382-.381.674-.718.944-.943" />
              </svg>
            )}
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
