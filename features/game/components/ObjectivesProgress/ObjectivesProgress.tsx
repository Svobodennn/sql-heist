'use client'

import type { Objective } from '@/lib/schema/case'
import { cx } from '@/ui/cx'
import { useTranslation } from '@/i18n/useTranslation'
import { firstIncompleteIndex } from '../../lib/caseView'
import { IconCheck, IconLock, IconTarget } from '../icons'
import styles from './ObjectivesProgress.module.css'

// The case's objectives as a compact HORIZONTAL progress stepper across the top of
// the case. Three states carried by icon + label + position + color (never color
// alone, §11): done ✓ / active / locked, numbered, each with its short goal. Done
// items and the single active one are selectable (jump / revisit). Structural labels
// come from the i18n catalog; the per-objective goal VALUE is localized case content.
interface ObjectivesProgressProps {
  objectives: Objective[]
  completed: ReadonlySet<string>
  selectedIndex: number
  onSelect: (index: number) => void
}

type ItemState = 'done' | 'active' | 'locked'

// Maps a state to its catalog key suffix under game.case.objective.*
const STATE_KEY: Record<ItemState, string> = {
  done: 'cleared',
  active: 'active',
  locked: 'locked',
}

export function ObjectivesProgress({
  objectives,
  completed,
  selectedIndex,
  onSelect,
}: ObjectivesProgressProps) {
  const { t } = useTranslation()
  const active = firstIncompleteIndex(objectives, completed)

  const stateOf = (index: number, id: string): ItemState => {
    if (completed.has(id)) return 'done'
    return index === active ? 'active' : 'locked'
  }

  return (
    <nav className={styles.wrap} aria-label={t('game.case.objective.progressAria')}>
      <ol className={styles.steps}>
        {objectives.map((objective, index) => {
          const state = stateOf(index, objective.id)
          const selectable = index <= active // done items + the active one
          const isSelected = index === selectedIndex
          const order = String(index + 1).padStart(2, '0')

          const inner = (
            <>
              <span
                className={cx(styles.marker, styles[`marker--${state}`])}
                aria-hidden="true"
              >
                {state === 'done' ? (
                  <IconCheck size={15} />
                ) : state === 'locked' ? (
                  <IconLock size={13} />
                ) : (
                  <IconTarget size={14} />
                )}
              </span>
              <span className={styles.body}>
                <span className={cx('mono', styles.order)}>
                  {t('game.case.objective.order', { order })}
                </span>
                <span className={styles.goal}>{objective.goal}</span>
                {/* State conveyed to AT here — icon + color are presentational. */}
                <span className="sr-only">{t(`game.case.objective.${STATE_KEY[state]}`)}</span>
              </span>
            </>
          )

          return (
            <li
              key={objective.id}
              className={cx(
                styles.step,
                styles[`step--${state}`],
                isSelected && styles.selected,
              )}
              aria-current={isSelected ? 'step' : undefined}
            >
              {selectable ? (
                <button
                  type="button"
                  className={styles.trigger}
                  onClick={() => onSelect(index)}
                >
                  {inner}
                </button>
              ) : (
                <div className={styles.trigger}>{inner}</div>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
