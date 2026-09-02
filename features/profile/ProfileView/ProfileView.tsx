'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { localeHref } from '@/i18n/localeHref'
import { useTranslation } from '@/i18n/useTranslation'
import { getPublicProfile, type PublicProfile } from '../lib/profileQuery'
import styles from './ProfileView.module.css'

type ViewState =
  | { kind: 'resolving' }
  | { kind: 'empty' }
  | { kind: 'loading'; username: string }
  | { kind: 'private'; username: string }
  | { kind: 'ready'; profile: PublicProfile }
  | { kind: 'error'; username: string }

const DATE_LOCALES = { en: 'en-US', tr: 'tr-TR', pl: 'pl-PL' } as const

function initialState(username: string | null): ViewState {
  if (username === null) return { kind: 'resolving' }
  return username ? { kind: 'loading', username } : { kind: 'empty' }
}

function stateForUsername(state: ViewState, username: string | null): ViewState {
  if (username === null) return state.kind === 'resolving' ? state : { kind: 'resolving' }
  if (!username) return { kind: 'empty' }
  if (state.kind === 'ready' && state.profile.username.toLowerCase() === username) {
    return state
  }
  if (
    (state.kind === 'loading' || state.kind === 'private' || state.kind === 'error') &&
    state.username === username
  ) {
    return state
  }
  return { kind: 'loading', username }
}

export function ProfileView({ username }: { readonly username: string | null }) {
  const { locale, t } = useTranslation()
  const normalizedUsername = username === null ? null : username.trim().toLowerCase()
  const [state, setState] = useState<ViewState>(() => initialState(normalizedUsername))

  useEffect(() => {
    if (normalizedUsername === null) {
      setState({ kind: 'resolving' })
      return
    }
    if (!normalizedUsername) {
      setState({ kind: 'empty' })
      return
    }

    let active = true
    setState({ kind: 'loading', username: normalizedUsername })
    void getPublicProfile(normalizedUsername)
      .then((profile) => {
        if (!active) return
        setState(
          profile ? { kind: 'ready', profile } : { kind: 'private', username: normalizedUsername },
        )
      })
      .catch(() => {
        if (active) setState({ kind: 'error', username: normalizedUsername })
      })
    return () => {
      active = false
    }
  }, [normalizedUsername])

  // Effects run after render. When the profile path changes, keep the
  // previous request's result from flashing under the new username for a frame.
  const visibleState = stateForUsername(state, normalizedUsername)

  if (visibleState.kind === 'empty') {
    return (
      <ProfileShell stamp={t('profile.stamp')} title={t('profile.emptyTitle')}>
        <p className={styles.copy}>{t('profile.emptyBody')}</p>
        <Link className="btn btn--ghost" href={localeHref('/cases', locale)}>
          {t('profile.browseCases')}
        </Link>
      </ProfileShell>
    )
  }

  if (visibleState.kind === 'resolving' || visibleState.kind === 'loading') {
    return (
      <ProfileShell stamp={t('profile.stamp')} title={t('profile.loading')}>
        <p className={styles.copy} role="status" aria-live="polite">
          {t('profile.loadingBody')}
        </p>
      </ProfileShell>
    )
  }

  if (visibleState.kind === 'private') {
    return (
      <ProfileShell stamp={t('profile.stamp')} title={t('profile.privateTitle')}>
        <p className={styles.copy}>{t('profile.privateBody')}</p>
      </ProfileShell>
    )
  }

  if (visibleState.kind === 'error') {
    return (
      <ProfileShell stamp={t('profile.stamp')} title={t('profile.errorTitle')}>
        <p className={styles.copy} role="alert">
          {t('profile.errorBody')}
        </p>
      </ProfileShell>
    )
  }

  const { profile } = visibleState
  const joined = new Intl.DateTimeFormat(DATE_LOCALES[locale], {
    year: 'numeric',
    month: 'long',
  }).format(new Date(profile.createdAt))

  return (
    <section className={`container ${styles.page}`} aria-labelledby="profile-title">
      <article className={`panel ${styles.dossier}`}>
        <p className="stamp">{t('profile.stamp')}</p>
        <div className={styles.identity}>
          <div aria-hidden="true" className={styles.avatar}>
            {profile.username.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 id="profile-title" className={styles.title}>
              {profile.displayName ?? profile.username}
            </h1>
            <p className={`mono ${styles.username}`}>@{profile.username}</p>
          </div>
        </div>

        <dl className={styles.stats}>
          <div className={styles.stat}>
            <dt>{t('profile.objectivesCleared')}</dt>
            <dd>{profile.objectivesCleared}</dd>
          </div>
          <div className={styles.stat}>
            <dt>{t('profile.joined')}</dt>
            <dd>{joined}</dd>
          </div>
        </dl>
      </article>
    </section>
  )
}

function ProfileShell({
  stamp,
  title,
  children,
}: {
  stamp: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className={`container ${styles.page}`} aria-labelledby="profile-state-title">
      <div className={`panel ${styles.state}`}>
        <p className="stamp">{stamp}</p>
        <h1 id="profile-state-title" className={styles.stateTitle}>
          {title}
        </h1>
        {children}
      </div>
    </section>
  )
}
