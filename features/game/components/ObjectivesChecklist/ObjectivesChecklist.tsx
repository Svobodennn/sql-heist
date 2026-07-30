'use client'

import type { Objective } from '@/lib/schema/case'
import { cx } from '@/ui/cx'
import { firstIncompleteIndex, techniqueLabel } from '../../lib/caseView'
import { Stamp } from '../Stamp'
import { IconCheck, IconLock, IconTarget } from '../icons'
import styles from './ObjectivesChecklist.module.css'

// The case's objectives as a progress stepper (docs/cases-design.md — "an
// objectives checklist (progress)"). Three states, carried by icon + label +
// position + color (never color alone, §11): done ✓ / active / locked. Done and
// the single active objective are selectable (revisit / play); objectives beyond
// the active one are locked until earlier ones are cleared. Render-only — progress
// is owned by the CasePlayer.
interface ObjectivesChecklistProps {
  objectives: Objective[]
  completed: ReadonlySet<string>
  selectedIndex: number
  onSelect: (index: number) => void
}

type ItemState = 'done' | 'active' | 'locked'

export function ObjectivesChecklist({
  objectives,
  completed,
  selectedIndex,
  onSelect,
}: ObjectivesChecklistProps) {
  const active = firstIncompleteIndex(objectives, completed)

  const stateOf = (index: number, id: string): ItemState => {
    if (completed.has(id)) return 'done'
    return index === active ? 'active' : 'locked'
  }

  const stateWord: Record<ItemState, string> = {
    done: 'cleared',
    active: 'current objective',
    locked: 'locked — clear the earlier objectives first',
  }

  return (
    <nav className={cx('panel', styles.wrap)} aria-label="Objectives">
      <Stamp>The Plan</Stamp>
      <ol className={styles.list}>
        {objectives.map((objective, index) => {
          const state = stateOf(index, objective.id)
          const selectable = index <= active // done items + the active one
          const isSelected = index === selectedIndex
          const order = String(index + 1).padStart(2, '0')

          const inner = (
            <>
              <span className={cx(styles.marker, styles[`marker--${state}`])} aria-hidden="true">
                {state === 'done' ? (
                  <IconCheck size={15} />
                ) : state === 'locked' ? (
                  <IconLock size={13} />
                ) : (
                  <IconTarget size={14} />
                )}
              </span>
              <span className={styles.body}>
                <span className={styles.goal}>{objective.goal}</span>
                <span className={cx('mono', styles.technique)}>
                  {order} · {techniqueLabel(objective.technique)}
                </span>
                {/* State conveyed to AT here (icon + color are aria-hidden /
                    presentational); readable whether the row is a button or a
                    non-interactive locked div. */}
                <span className="sr-only">{stateWord[state]}</span>
              </span>
            </>
          )

          return (
            <li
              key={objective.id}
              className={cx(styles.item, styles[`item--${state}`], isSelected && styles.selected)}
              aria-current={isSelected ? 'step' : undefined}
            >
              {selectable ? (
                <button type="button" className={styles.trigger} onClick={() => onSelect(index)}>
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
