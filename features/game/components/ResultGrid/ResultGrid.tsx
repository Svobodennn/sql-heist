'use client'

import type { ExecutionResult } from '@/lib/engine/sqlRunner'
import type { WinCondition } from '@/lib/schema/level'
import { cx } from '../../lib/cx'
import { cellToText, computeLoot } from '../../lib/resultView'
import { useTranslation } from '@/i18n/useTranslation'
import { IconAlert, IconLootTag } from '../icons'
import styles from './ResultGrid.module.css'

// RESULT (docs/04-frontend-ux.md §5.4): the query result as a real <table>, the
// verbatim SQLite error (errors are teachers here), or the "no run yet" empty
// state. Loot is flagged with icon + label + tint (never color alone, §11).
// All cell text is React-escaped (K7/XSS).

interface ResultGridProps {
  result: ExecutionResult | null
  winCondition?: WinCondition
  loading?: boolean
  className?: string
}

export function ResultGrid({ result, winCondition, loading, className }: ResultGridProps) {
  const { t } = useTranslation()
  if (loading) {
    return (
      <div className={cx(styles.wrap, className)} aria-busy="true" aria-label={t('game.result.running')}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.skeletonRow}>
            <span className={styles.shimmer} />
          </div>
        ))}
      </div>
    )
  }

  if (!result) {
    return (
      <div className={cx(styles.wrap, styles.empty, className)}>
        <p className={styles.emptyText}>{t('game.result.noRun')}</p>
      </div>
    )
  }

  if (result.error) {
    return (
      <div className={cx(styles.wrap, styles.error, className)} role="alert">
        <p className={styles.errorHead}>
          <IconAlert size={16} />
          <span>{t('game.result.errorHead')}</span>
        </p>
        <pre className={cx('mono', styles.errorMsg)}>{result.error}</pre>
        <p className={styles.errorGloss}>{t('game.result.errorGloss')}</p>
      </div>
    )
  }

  if (result.rowCount === 0) {
    return (
      <div className={cx(styles.wrap, styles.empty, className)}>
        <p className={styles.emptyText}>{t('game.result.nothing')}</p>
      </div>
    )
  }

  const loot = computeLoot(winCondition, result.columns, result.rows)

  return (
    <div className={cx(styles.wrap, className)}>
      <div className={styles.scroll}>
        <table className={cx('mono', styles.table)}>
          <caption className="sr-only">
            Query result — {result.rowCount} row{result.rowCount === 1 ? '' : 's'} returned
          </caption>
          <thead>
            <tr>
              {result.columns.map((col) => (
                <th key={col} scope="col">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, r) => {
              const isLootRow = loot.rows.has(r)
              return (
                <tr key={r} className={cx(isLootRow && styles.lootRow)}>
                  {row.map((cell, c) => {
                    const isLootCell = loot.cells.has(`${r}:${c}`)
                    return (
                      <td key={c} className={cx(isLootCell && styles.lootCell)}>
                        <span>{cellToText(cell)}</span>
                        {isLootRow && c === 0 && (
                          <span className={styles.lootTag}>
                            <IconLootTag size={13} />
                            {t('game.result.loot')}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className={styles.meta}>
        {result.rowCount} row{result.rowCount === 1 ? '' : 's'} · {Math.round(result.durationMs)}ms
      </p>
    </div>
  )
}
