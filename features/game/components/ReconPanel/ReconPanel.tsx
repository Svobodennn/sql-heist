'use client'

import { useMemo } from 'react'
import type { Level } from '@/lib/schema/level'
import { cx } from '@/ui/cx'
import { useTranslation } from '@/i18n/useTranslation'
import { Button } from '../Button'
import { BrowserChrome } from '../BrowserChrome'
import { MimicSurface, mimicUrl } from '../MimicSurface'
import { Stamp } from '../Stamp'
import { IconArrowRight } from '../icons'
import styles from './ReconPanel.module.css'

// Screen 2 — RECON (docs/04-frontend-ux.md §4). The mimic target is passive here
// (inspect only). The query template stays HIDDEN; the transparent SQL appears in
// Exploit. Recon Notes show `visibleSchema` — and for Blueprint the loot table is
// deliberately absent, forcing sqlite_master discovery later.
export function ReconPanel({ level, onMoveIn }: { level: Level; onMoveIn: () => void }) {
  const { t } = useTranslation()
  const url = useMemo(() => mimicUrl(level.target.appName, level.target.surface), [level.target])
  const emptyValues = useMemo(
    () => Object.fromEntries(level.target.fields.map((f) => [f.name, ''])),
    [level.target.fields],
  )

  return (
    <section className={cx('container', styles.wrap)}>
      <div className={styles.head}>
        <Stamp>{t('game.recon.stamp')}</Stamp>
        <h1 className={styles.screenHeading} data-phase-heading tabIndex={-1}>
          {t('game.recon.title', { app: level.target.appName })}
        </h1>
      </div>

      <div className={styles.grid}>
        <BrowserChrome url={url}>
          <MimicSurface
            surface={level.target.surface}
            appName={level.target.appName}
            fields={level.target.fields}
            values={emptyValues}
            interactive={false}
          />
        </BrowserChrome>

        <aside className={cx('panel', styles.notes)}>
          <Stamp>{t('game.recon.notes')}</Stamp>

          <div className={styles.schema}>
            <p className={styles.schemaHead}>{t('game.recon.visibleSchema')}</p>
            {level.database.visibleSchema.map((tbl) => (
              <div key={tbl.table} className={styles.table}>
                <p className={cx('mono', styles.tableName)}>{tbl.table}</p>
                <ul className={styles.cols}>
                  {tbl.columns.map((col) => (
                    <li key={col} className={cx('mono', styles.col)}>
                      {col}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className={styles.hypothesis}>{t('game.recon.hypothesis')}</p>
        </aside>
      </div>

      <div className={styles.actions}>
        <Button variant="primary" onClick={onMoveIn} iconRight={<IconArrowRight size={18} />}>
          {t('game.recon.moveIn')}
        </Button>
      </div>
    </section>
  )
}
