'use client'

import type { ReconNotebook as Notebook } from '../lib/reconNotebook'
import { notebookSize } from '../lib/reconNotebook'
import { cx } from '../lib/cx'
import { IconChevronDown, IconNotebook } from './icons'
import styles from './ReconNotebook.module.css'

// Recon notebook (docs/ws3-design.md "UI scope"): a collapsible ledger that
// auto-accrues everything the player has learned this job — the advertised
// visibleSchema plus any column names pried out of a result grid. State lives in
// the ExploitConsole (features/game/lib/reconNotebook); this only renders it.
// Column names are level/engine strings, but rendered as escaped text regardless.
export function ReconNotebook({ notebook }: { notebook: Notebook }) {
  const size = notebookSize(notebook)
  const discovered = notebook.discoveredColumns

  return (
    <details className={styles.wrap}>
      <summary className={styles.summary}>
        <IconChevronDown size={16} className={styles.chevron} />
        <IconNotebook size={16} />
        <span className={styles.summaryText}>Recon notebook</span>
        <span className={cx('mono', styles.count)} aria-label={`${size.columns} facts logged`}>
          {size.columns}
        </span>
      </summary>

      <div className={styles.body}>
        <section aria-label="Advertised schema">
          <p className={styles.sectionHead}>Advertised</p>
          <ul className={styles.tables}>
            {notebook.tables.map((tbl) => (
              <li key={tbl.table} className={styles.table}>
                <span className={cx('mono', styles.tableName)}>{tbl.table}</span>
                <span className={styles.cols}>
                  {tbl.columns.map((col) => (
                    <span key={col} className={cx('mono', styles.col)}>
                      {col}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Columns discovered from results">
          <p className={styles.sectionHead}>Pried out of results</p>
          {discovered.length > 0 ? (
            <ul className={styles.discovered}>
              {discovered.map((col) => (
                <li key={col} className={cx('mono', styles.discoveredCol)}>
                  {col}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyNote}>
              Nothing yet. Make the database name a column it never advertised — it&apos;ll land
              here.
            </p>
          )}
        </section>
      </div>
    </details>
  )
}
