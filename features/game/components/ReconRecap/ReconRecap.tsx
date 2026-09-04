'use client'

import type { VisibleTable } from '@/lib/schema/level'
import { cx } from '@/ui/cx'
import { useTranslation } from '@/i18n/useTranslation'
import { IconChevronDown } from '../icons'
import styles from './ReconRecap.module.css'

export function ReconRecap({
  appName,
  visibleSchema,
}: {
  appName: string
  visibleSchema: VisibleTable[]
}) {
  const { t } = useTranslation()

  return (
    <details className={styles.wrap}>
      <summary className={styles.summary}>
        <IconChevronDown size={16} className={styles.chevron} />
        <span>
          {t('game.exploit.recap')} <span className="mono">{appName}</span>
        </span>
        <span className={styles.count}>{visibleSchema.length}</span>
      </summary>
      <div className={styles.body}>
        <p className={styles.head}>{t('game.exploit.visibleSchema')}</p>
        <ul className={styles.tables}>
          {visibleSchema.map((table) => (
            <li key={table.table} className={styles.table}>
              <span className={cx('mono', styles.tableName)}>{table.table}</span>
              <span className={styles.columns}>
                {table.columns.map((column) => (
                  <span key={column} className={cx('mono', styles.column)}>
                    {column}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  )
}
