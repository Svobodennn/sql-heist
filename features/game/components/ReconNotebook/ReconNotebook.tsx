'use client'

import type { ReconNotebook as Notebook } from '../../lib/reconNotebook'
import { notebookSize } from '../../lib/reconNotebook'
import { cx } from '../../lib/cx'
import { useTranslation } from '@/i18n/useTranslation'
import { IconChevronDown, IconNotebook } from '../icons'
import styles from './ReconNotebook.module.css'

// Recon notebook (docs/ws3-design.md "UI scope"): a collapsible ledger of the schema the
// player PRIED LOOSE this job — tables/columns the recon recap never listed but that
// surfaced as result VALUES (e.g. a hidden table's CREATE statement UNION'd out of
// sqlite_master). It deliberately does NOT restate the advertised visibleSchema — that
// already sits in the top recap; mirroring it here was the WS3 bug. State lives in the
// ExploitConsole (features/game/lib/reconNotebook); this only renders it. Table/column
// names are engine strings, but rendered as escaped text regardless.
export function ReconNotebook({ notebook }: { notebook: Notebook }) {
  const { t } = useTranslation()
  const size = notebookSize(notebook)
  const facts = size.tables + size.columns
  const discovered = notebook.discovered

  return (
    <details className={styles.wrap}>
      <summary className={styles.summary}>
        <IconChevronDown size={16} className={styles.chevron} />
        <IconNotebook size={16} />
        <span className={styles.summaryText}>{t('game.notebook.title')}</span>
        <span
          className={cx('mono', styles.count)}
          aria-label={t('game.notebook.factsAria', { n: facts })}
        >
          {facts}
        </span>
      </summary>

      <div className={styles.body}>
        <section aria-label={t('game.notebook.priedAria')}>
          <p className={styles.sectionHead}>{t('game.notebook.pried')}</p>
          {discovered.length > 0 ? (
            <ul className={styles.tables}>
              {discovered.map((tbl) => (
                <li key={tbl.table} className={styles.table}>
                  <span className={cx('mono', styles.discoveredTableName)}>{tbl.table}</span>
                  <span className={styles.cols}>
                    {tbl.columns.map((col) => (
                      <span key={col} className={cx('mono', styles.discoveredCol)}>
                        {col}
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyNote}>{t('game.notebook.empty')}</p>
          )}
        </section>
      </div>
    </details>
  )
}
