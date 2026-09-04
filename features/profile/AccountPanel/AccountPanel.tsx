'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { localeHref } from '@/i18n/localeHref'
import { useTranslation } from '@/i18n/useTranslation'
import { useAuth } from '@/features/auth/useAuth'
import { signInOAuth } from '@/features/auth/authClient'
import { consumeDeletionReauthReceipt } from '@/features/auth/oauthFlow'
import {
  getOAuthProviders,
  hasEmailIdentity,
  type OAuthProvider,
} from '@/features/auth/oauthProfile'
import {
  DISPLAY_NAME_MAX_LENGTH,
  deleteMyAccount,
  exportMyData,
  profileFieldsAreValid,
  requestMyAccountDeletion,
  setLeaderboardOptIn,
  type ProfileQueryErrorCode,
  updateMyProfile,
} from '../lib/profileQuery'
import { publicProfileHref } from '../lib/publicProfilePath'
import { DeleteAccountDialog, type DeleteAccountError } from '../DeleteAccountDialog'
import styles from './AccountPanel.module.css'

type ActionScope = 'profile' | 'visibility' | 'export'
type ActionFeedbackValue = { kind: 'success' | 'error'; message: string }
type FeedbackState = Partial<Record<ActionScope, ActionFeedbackValue>>

export function AccountPanel() {
  const router = useRouter()
  const { locale, t } = useTranslation()
  const { status, user, profile, profileReady, refreshProfile, signOut } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [optIn, setOptIn] = useState(false)
  const [mutationPending, setMutationPending] = useState<ActionScope | null>(null)
  const [exporting, setExporting] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>({})
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<DeleteAccountError>(null)
  const [oauthDeletionReady, setOAuthDeletionReady] = useState(false)
  const mutationInFlight = useRef(false)
  const deleteTriggerRef = useRef<HTMLButtonElement>(null)
  const deletionSubmittedRef = useRef(false)
  const deletionInFlight = useRef(false)
  const deletionReceiptCheckedFor = useRef<string | null>(null)

  useEffect(() => {
    if (status === 'anon') {
      router.replace(
        deletionSubmittedRef.current
          ? localeHref('/', locale)
          : localeHref('/auth/sign-in', locale),
      )
    }
  }, [status, locale, router])

  useEffect(() => {
    if (!profile) return
    setDisplayName(profile.displayName ?? '')
    setOptIn(profile.leaderboardOptIn)
  }, [profile])

  const closeDelete = useCallback(() => {
    if (deleting) return
    setDeleteOpen(false)
    setDeleteError(null)
    setOAuthDeletionReady(false)
    deleteTriggerRef.current?.focus()
  }, [deleting])

  const submitDeletion = useCallback(
    async (request: () => Promise<void>, reauthError: DeleteAccountError = 'reauth') => {
      if (deletionInFlight.current) return
      deletionInFlight.current = true
      setDeleting(true)
      setDeleteError(null)
      try {
        await request()
        deletionSubmittedRef.current = true
        try {
          await signOut()
        } catch {
          // The server-side soft lock already succeeded. Navigation must not turn
          // a sign-out network failure into a misleading, impossible-to-retry error.
        }
        router.replace(localeHref('/', locale))
      } catch (error) {
        deletionInFlight.current = false
        setDeleteOpen(true)
        setDeleteError(isProfileQueryError(error, 'reauth-failed') ? reauthError : 'request')
        setDeleting(false)
      }
    },
    [locale, router, signOut],
  )

  useEffect(() => {
    if (status !== 'authed' || !user || !profileReady || !profile) return
    if (deletionReceiptCheckedFor.current === user.id) return
    deletionReceiptCheckedFor.current = user.id
    if (!consumeDeletionReauthReceipt(user.id)) return

    setDeleteError(null)
    setOAuthDeletionReady(true)
    setDeleteOpen(true)
  }, [status, user, profileReady, profile])

  if (status === 'disabled') {
    return <AccountState title={t('account.disabledTitle')} body={t('account.disabledBody')} />
  }

  if (status !== 'authed' || !user || !profileReady || !profile) {
    return <AccountLoading label={t('account.loading')} />
  }

  const clearFeedback = (scope: ActionScope) => {
    setFeedback((previous) => {
      const { [scope]: _removed, ...remaining } = previous
      return remaining
    })
  }

  const reportFeedback = (scope: ActionScope, value: ActionFeedbackValue) => {
    setFeedback((previous) => ({ ...previous, [scope]: value }))
  }

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault()
    if (mutationInFlight.current) return
    clearFeedback('profile')
    if (!profileFieldsAreValid(displayName)) {
      reportFeedback('profile', { kind: 'error', message: t('account.errors.invalidProfile') })
      return
    }
    mutationInFlight.current = true
    setMutationPending('profile')
    try {
      await updateMyProfile({ displayName })
      await refreshProfile()
      reportFeedback('profile', { kind: 'success', message: t('account.saved') })
    } catch {
      reportFeedback('profile', { kind: 'error', message: t('account.errors.save') })
    } finally {
      mutationInFlight.current = false
      setMutationPending(null)
    }
  }

  const changeVisibility = async (next: boolean) => {
    if (mutationInFlight.current) return
    const previous = optIn
    clearFeedback('visibility')
    setOptIn(next)
    mutationInFlight.current = true
    setMutationPending('visibility')
    try {
      await setLeaderboardOptIn(next)
      await refreshProfile()
      reportFeedback('visibility', {
        kind: 'success',
        message: t(next ? 'account.visibilityPublic' : 'account.visibilityPrivate'),
      })
    } catch {
      setOptIn(previous)
      reportFeedback('visibility', {
        kind: 'error',
        message: t('account.errors.visibility'),
      })
    } finally {
      mutationInFlight.current = false
      setMutationPending(null)
    }
  }

  const downloadData = async () => {
    if (exporting) return
    clearFeedback('export')
    setExporting(true)
    try {
      const blob = await exportMyData()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `sql-heist-${profile.username}-data.json`
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      reportFeedback('export', { kind: 'success', message: t('account.exportReady') })
    } catch {
      reportFeedback('export', { kind: 'error', message: t('account.errors.export') })
    } finally {
      setExporting(false)
    }
  }

  const requestPasswordDeletion = (password: string) => {
    void submitDeletion(() => deleteMyAccount(password), 'password')
  }

  const startOAuthDeletion = async (provider: OAuthProvider) => {
    if (deletionInFlight.current) return
    deletionInFlight.current = true
    setDeleting(true)
    setDeleteError(null)
    setOAuthDeletionReady(false)
    const result = await signInOAuth(provider, {
      purpose: 'account-deletion',
      returnTo: localeHref('/account', locale),
      expectedUserId: user.id,
    })
    if (!result.error) return

    deletionInFlight.current = false
    setDeleting(false)
    setDeleteError('request')
  }

  const confirmOAuthDeletion = () => {
    if (!oauthDeletionReady) return
    setOAuthDeletionReady(false)
    void submitDeletion(requestMyAccountDeletion)
  }

  const oauthProviders = getOAuthProviders(user)
  const hasPassword = hasEmailIdentity(user)

  return (
    <section className={`container ${styles.page}`} aria-labelledby="account-title">
      <header className={styles.header}>
        <p className="stamp">{t('account.stamp')}</p>
        <h1 id="account-title" className={styles.title}>
          {t('account.title')}
        </h1>
        <p className={styles.lede}>{t('account.lede')}</p>
      </header>

      <div className={styles.grid}>
        <section className={`panel ${styles.panel}`} aria-labelledby="account-profile-title">
          <h2 id="account-profile-title" className={styles.panelTitle}>
            {t('account.profileTitle')}
          </h2>
          <form className={styles.form} onSubmit={saveProfile} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="account-username">
                {t('account.username')}
              </label>
              <input
                id="account-username"
                className={`mono ${styles.input}`}
                value={profile.username}
                readOnly
                aria-describedby="account-username-hint"
              />
              <p id="account-username-hint" className={styles.hint}>
                {t('account.usernameLocked')}
              </p>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="account-display-name">
                {t('account.displayName')}
              </label>
              <input
                id="account-display-name"
                className={styles.input}
                value={displayName}
                maxLength={DISPLAY_NAME_MAX_LENGTH}
                disabled={mutationPending !== null}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
            <button className="btn btn--primary" type="submit" disabled={mutationPending !== null}>
              {mutationPending === 'profile' ? t('account.saving') : t('account.save')}
            </button>
            <ActionFeedback value={feedback.profile} />
          </form>
        </section>

        <section className={`panel ${styles.panel}`} aria-labelledby="account-visibility-title">
          <h2 id="account-visibility-title" className={styles.panelTitle}>
            {t('account.visibilityTitle')}
          </h2>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={optIn}
              disabled={mutationPending !== null}
              aria-describedby="account-visibility-consent"
              onChange={(event) => void changeVisibility(event.target.checked)}
            />
            <span>{t('account.visibilityLabel')}</span>
          </label>
          <p id="account-visibility-consent" className={styles.hint}>
            {t('account.visibilityConsent')}{' '}
            <Link className={styles.hintLink} href={localeHref('/privacy', locale)}>
              {t('account.visibilityPrivacyLink')}
            </Link>
            .
          </p>
          {optIn && (
            <a className={styles.profileLink} href={publicProfileHref(profile.username, locale)}>
              {t('account.viewPublicProfile')}
            </a>
          )}
          <ActionFeedback value={feedback.visibility} />
        </section>

        <section className={`panel ${styles.panel}`} aria-labelledby="account-data-title">
          <h2 id="account-data-title" className={styles.panelTitle}>
            {t('account.dataTitle')}
          </h2>
          <p className={styles.panelCopy}>{t('account.dataBody')}</p>
          <button
            className="btn btn--ghost"
            type="button"
            disabled={exporting}
            onClick={() => void downloadData()}
          >
            {exporting ? t('account.exporting') : t('account.export')}
          </button>
          <ActionFeedback value={feedback.export} />
        </section>

        <section
          className={`panel ${styles.panel} ${styles.danger}`}
          aria-labelledby="account-delete-title"
        >
          <h2 id="account-delete-title" className={styles.panelTitle}>
            {t('account.deleteTitle')}
          </h2>
          <p className={styles.panelCopy}>{t('account.deleteBody')}</p>
          <button
            ref={deleteTriggerRef}
            className="btn btn--danger"
            type="button"
            onClick={() => setDeleteOpen(true)}
          >
            {t('account.deleteRequest')}
          </button>
        </section>
      </div>

      {deleteOpen && (
        <DeleteAccountDialog
          username={profile.username}
          deleting={deleting}
          error={deleteError}
          hasPasswordIdentity={hasPassword}
          oauthProviders={oauthProviders}
          oauthReauthReady={oauthDeletionReady}
          onClose={closeDelete}
          onConfirmPassword={requestPasswordDeletion}
          onConfirmOAuth={startOAuthDeletion}
          onConfirmOAuthReceipt={confirmOAuthDeletion}
          onEdit={() => setDeleteError(null)}
        />
      )}
    </section>
  )
}

function ActionFeedback({ value }: { value?: ActionFeedbackValue }) {
  if (!value) return null
  return (
    <p
      className={`${styles.feedback} ${value.kind === 'error' ? styles.feedbackError : ''}`}
      role={value.kind === 'error' ? 'alert' : 'status'}
    >
      {value.message}
    </p>
  )
}

function isProfileQueryError(error: unknown, code: ProfileQueryErrorCode): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code
}

function AccountState({ title, body }: { title: string; body: string }) {
  return (
    <section className={`container ${styles.page}`}>
      <div className={`panel ${styles.state}`}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.lede}>{body}</p>
      </div>
    </section>
  )
}

function AccountLoading({ label }: { label: string }) {
  return (
    <section
      className={`container ${styles.page}`}
      role="status"
      aria-label={label}
      aria-busy="true"
    >
      <div className={styles.loading} aria-hidden="true">
        <header className={styles.header}>
          <span className={`${styles.skeleton} ${styles.skeletonStamp}`} />
          <span className={`${styles.skeleton} ${styles.skeletonTitle}`} />
          <span className={`${styles.skeleton} ${styles.skeletonLede}`} />
        </header>
        <div className={styles.grid}>
          {Array.from({ length: 4 }, (_, index) => (
            <div className={`panel ${styles.panel} ${styles.skeletonPanel}`} key={index}>
              <span className={`${styles.skeleton} ${styles.skeletonPanelTitle}`} />
              <span className={`${styles.skeleton} ${styles.skeletonLine}`} />
              <span className={`${styles.skeleton} ${styles.skeletonLineShort}`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
