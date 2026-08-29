import { describe, expect, it } from 'vitest'

import {
  isCursorEligible,
  resolveRingTarget,
  stepFollowAxis,
} from '@/app/components/CinematicCursor/cursorMath'

describe('production cinematic cursor math', () => {
  it('eases toward the pointer without mutating the prior state', () => {
    const current = Object.freeze({ position: 0, velocity: 0 })

    const next = stepFollowAxis(current, 100)

    expect(next).toEqual({ position: 18, velocity: 18 })
    expect(current).toEqual({ position: 0, velocity: 0 })
  })

  it('returns a circular idle target and an immutable magnetic target', () => {
    const pointer = Object.freeze({ x: 50, y: 60 })
    const bounds = Object.freeze({ left: 10, top: 20, width: 100, height: 60, radius: 4 })

    expect(resolveRingTarget(pointer)).toEqual({
      x: 33,
      y: 43,
      width: 34,
      height: 34,
      radius: 17,
    })
    expect(resolveRingTarget(pointer, bounds, 8)).toEqual({
      x: 2,
      y: 12,
      width: 116,
      height: 76,
      radius: 12,
    })
    expect(pointer).toEqual({ x: 50, y: 60 })
    expect(bounds).toEqual({ left: 10, top: 20, width: 100, height: 60, radius: 4 })
  })

  it('enables the cursor only for an eligible fine pointer without reduced motion', () => {
    expect(isCursorEligible({ pointer: true, reducedMotion: false })).toBe(true)
    expect(isCursorEligible({ pointer: false, reducedMotion: false })).toBe(false)
    expect(isCursorEligible({ pointer: true, reducedMotion: true })).toBe(false)
  })
})
