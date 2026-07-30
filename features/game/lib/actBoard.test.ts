import { describe, expect, it } from 'vitest'
import type { JobMeta } from '../levels'
import { actOf, groupByAct } from './actBoard'

function meta(order: number, id = `job-${order}`): JobMeta {
  return {
    id,
    order,
    job: `Job ${order}`,
    title: `Title ${order}`,
    technique: 'auth-bypass',
    difficulty: 'easy',
    objective: 'do the thing',
  }
}

describe('actOf', () => {
  it('splits Act I (order <= 3) from Act II (order >= 4)', () => {
    expect(actOf(1)).toBe(1)
    expect(actOf(3)).toBe(1)
    expect(actOf(4)).toBe(2)
    expect(actOf(8)).toBe(2)
  })
})

describe('groupByAct', () => {
  it('with only the 3 MVP levels, returns Act I alone (no empty Act II header)', () => {
    const sections = groupByAct([meta(1), meta(2), meta(3)])
    expect(sections).toHaveLength(1)
    expect(sections[0].act).toBe(1)
    expect(sections[0].jobs.map((j) => j.order)).toEqual([1, 2, 3])
  })

  it('with all 8 jobs, returns two headed sections split 3 / 5', () => {
    const sections = groupByAct([1, 2, 3, 4, 5, 6, 7, 8].map((o) => meta(o)))
    expect(sections.map((s) => s.act)).toEqual([1, 2])
    expect(sections[0].jobs).toHaveLength(3)
    expect(sections[1].jobs).toHaveLength(5)
    expect(sections[1].jobs.map((j) => j.order)).toEqual([4, 5, 6, 7, 8])
  })

  it('preserves incoming order within an act', () => {
    const [actI] = groupByAct([meta(3, 'c'), meta(1, 'a'), meta(2, 'b')])
    expect(actI.jobs.map((j) => j.id)).toEqual(['c', 'a', 'b'])
  })

  it('returns nothing for an empty board', () => {
    expect(groupByAct([])).toEqual([])
  })

  it('every section carries a title + tagline for its heading', () => {
    const sections = groupByAct([meta(1), meta(4)])
    expect(sections.every((s) => s.title.length > 0 && s.tagline.length > 0)).toBe(true)
  })
})
