'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/features/auth/useAuth'
import { localeHref } from '@/i18n/localeHref'
import { useTranslation } from '@/i18n/useTranslation'
import {
  getLeaderboard,
  getMyRank,
  type LeaderboardRow,
  type MyRank,
} from '../lib/leaderboardQuery'
import styles from './LeaderboardTable.module.css'

type BoardState =
  { kind: 'loading' } | { kind: 'ready'; rows: LeaderboardRow[] } | { kind: 'error' }

type RankState =
  | { kind: 'hidden' }
  | { kind: 'loading'; userId: string }
  | { kind: 'ready'; userId: string; rank: MyRank }
  | { kind: 'unranked'; userId: string }
  | { kind: 'error'; userId: string }

const DATE_LOCALES = { en: 'en-US', tr: 'tr-TR', pl: 'pl-PL' } as const

export function LeaderboardTable() {
  const { locale, t } = useTranslation()
  const { status, user } = useAuth()
  const [board, setBoard] = useState<BoardState>({ kind: 'loading' })
  const [ownRank, setOwnRank] = useState<RankState>({ kind: 'hidden' })

  useEffect(() => {
    let active = true
    void getLeaderboard()
      .then((rows) => {
        if (active) setBoard({ kind: 'ready', rows })
      })
      .catch(() => {
        if (active) setBoard({ kind: 'error' })
      })
    return () => {
      active = false
    }
  }, [])

  const userId = user?.id ?? null

  useEffect(() => {
    if (status !== 'authed' || !userId) {
      setOwnRank({ kind: 'hidden' })
      return
    }

    let active = true
    setOwnRank({ kind: 'loading', userId })
    void getMyRank()
      .then((rank) => {
        if (!active) return
        setOwnRank(rank ? { kind: 'ready', userId, rank } : { kind: 'unranked', userId })
      })
      .catch(() => {
        if (active) setOwnRank({ kind: 'error', userId })
      })
    return () => {
      active = false
    }
  }, [status, userId])

  const visibleRank = rankStateForUser(ownRank, status, userId)

  return (
    <section className={`container ${styles.page}`} aria-labelledby="leaderboard-title">
      <header className={styles.intro}>
        <p className="stamp">{t('leaderboard.stamp')}</p>
        <h1 id="leaderboard-title" className={styles.title}>
          {t('leaderboard.title')}
        </h1>
        <p className={styles.lede}>{t('leaderboard.intro')}</p>
        <div className={styles.disclosure} role="note">
          <strong>{t('leaderboard.casualLabel')}</strong>
          <span>{t('leaderboard.casualBody')}</span>
        </div>
      </header>

      {visibleRank.kind !== 'hidden' && <OwnRankCard state={visibleRank} />}
      <Board state={board} locale={locale} />
    </section>
  )
}

function rankStateForUser(
  state: RankState,
  status: ReturnType<typeof useAuth>['status'],
  userId: string | null,
): RankState {
  if (status !== 'authed' || !userId) return { kind: 'hidden' }
  if (state.kind === 'hidden' || state.userId !== userId) return { kind: 'loading', userId }
  return state
}

function OwnRankCard({ state }: { state: Exclude<RankState, { kind: 'hidden' }> }) {
  const { locale, t } = useTranslation()

  if (state.kind === 'loading') {
    return (
      <aside
        className={`panel ${styles.rankCard}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <p className="stamp">{t('leaderboard.yourRank')}</p>
        <p className={styles.rankCopy}>{t('leaderboard.rankLoading')}</p>
      </aside>
    )
  }

  if (state.kind === 'error') {
    return (
      <aside
        className={`panel ${styles.rankCard}`}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <p className="stamp">{t('leaderboard.yourRank')}</p>
        <p className={styles.rankCopy}>{t('leaderboard.rankError')}</p>
      </aside>
    )
  }

  if (state.kind === 'unranked') {
    return (
      <aside
        className={`panel ${styles.rankCard}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div>
          <p className="stamp">{t('leaderboard.yourRank')}</p>
          <p className={styles.rankCopy}>{t('leaderboard.notRanked')}</p>
          <p className={styles.rankMeta}>{t('leaderboard.notRankedBody')}</p>
        </div>
        <Link className="btn btn--ghost" href={localeHref('/account', locale)}>
          {t('leaderboard.manageVisibility')}
        </Link>
      </aside>
    )
  }

  return (
    <aside
      className={`panel ${styles.rankCard}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div>
        <p className="stamp">{t('leaderboard.yourRank')}</p>
        <p className={`mono ${styles.rankValue}`}>#{state.rank.rank}</p>
      </div>
      <p className={styles.rankMeta}>
        {t('leaderboard.rankObjectives', { count: state.rank.objectivesCleared })}
      </p>
    </aside>
  )
}

function Board({ state, locale }: { state: BoardState; locale: keyof typeof DATE_LOCALES }) {
  const { t } = useTranslation()

  if (state.kind === 'loading') {
    return (
      <div className={`panel ${styles.state}`} role="status" aria-live="polite">
        <h2>{t('leaderboard.loading')}</h2>
        <p>{t('leaderboard.loadingBody')}</p>
      </div>
    )
  }

  if (state.kind === 'error') {
    return (
      <div className={`panel ${styles.state}`} role="alert">
        <h2>{t('leaderboard.errorTitle')}</h2>
        <p>{t('leaderboard.errorBody')}</p>
      </div>
    )
  }

  if (state.rows.length === 0) {
    return (
      <div className={`panel ${styles.state}`}>
        <h2>{t('leaderboard.emptyTitle')}</h2>
        <p>{t('leaderboard.emptyBody')}</p>
        <Link className="btn btn--ghost" href={localeHref('/cases', locale)}>
          {t('leaderboard.browseCases')}
        </Link>
      </div>
    )
  }

  return (
    <div className={`panel ${styles.board}`}>
      <p className={styles.scrollHint}>{t('leaderboard.scrollHint')}</p>
      <div
        className={styles.tableWrap}
        role="region"
        aria-label={t('leaderboard.tableRegionAria')}
        tabIndex={0}
      >
        <table className={styles.table}>
          <caption className="sr-only">{t('leaderboard.tableCaption')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('leaderboard.rank')}</th>
              <th scope="col">{t('leaderboard.operative')}</th>
              <th scope="col">{t('leaderboard.country')}</th>
              <th scope="col">{t('leaderboard.objectives')}</th>
              <th scope="col">{t('leaderboard.lastActive')}</th>
            </tr>
          </thead>
          <tbody>
            {state.rows.map((row) => (
              <tr key={row.username}>
                <td className={`mono ${styles.position}`}>#{row.rank}</td>
                <td>
                  <Link
                    className={styles.operative}
                    href={localeHref(`/u?name=${encodeURIComponent(row.username)}`, locale)}
                  >
                    <span>{row.displayName ?? row.username}</span>
                    <span className="mono">@{row.username}</span>
                  </Link>
                </td>
                <td>{row.country ?? t('leaderboard.undisclosed')}</td>
                <td className={`mono ${styles.objectives}`}>{row.objectivesCleared}</td>
                <td>
                  {row.lastActive ? (
                    <time dateTime={row.lastActive}>
                      {new Intl.DateTimeFormat(DATE_LOCALES[locale], {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(row.lastActive))}
                    </time>
                  ) : (
                    t('leaderboard.neverActive')
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
