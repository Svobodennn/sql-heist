'use client'

import { useEffect, useRef } from 'react'
import {
  isCursorEligible,
  resolveRingTarget,
  stepFollowAxis,
  type FollowAxisState,
  type MagneticBounds,
  type RingTarget,
} from './cursorMath'
import styles from './CinematicCursor.module.css'

const POINTER_QUERY = '(pointer: fine) and (hover: hover) and (forced-colors: none)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const INTERACTIVE_SELECTOR = 'a, button, summary, [role="button"], [data-magnetic]'
const TEXT_SELECTOR = 'input, textarea, select, [contenteditable="true"]'

interface RingState {
  readonly x: FollowAxisState
  readonly y: FollowAxisState
  readonly width: FollowAxisState
  readonly height: FollowAxisState
  readonly radius: FollowAxisState
}

interface CursorElements {
  readonly cursor: HTMLDivElement
  readonly ring: HTMLSpanElement
  readonly dot: HTMLSpanElement
}

const SETTLE_EPSILON = 0.12

function createAxis(position: number): FollowAxisState {
  return { position, velocity: 0 }
}

function createRingState(target: RingTarget): RingState {
  return {
    x: createAxis(target.x),
    y: createAxis(target.y),
    width: createAxis(target.width),
    height: createAxis(target.height),
    radius: createAxis(target.radius),
  }
}

function stepRingState(current: RingState, target: RingTarget): RingState {
  return {
    x: stepFollowAxis(current.x, target.x),
    y: stepFollowAxis(current.y, target.y),
    width: stepFollowAxis(current.width, target.width),
    height: stepFollowAxis(current.height, target.height),
    radius: stepFollowAxis(current.radius, target.radius),
  }
}

function isRingSettled(state: RingState, target: RingTarget): boolean {
  return (
    Math.abs(state.x.position - target.x) <= SETTLE_EPSILON &&
    Math.abs(state.y.position - target.y) <= SETTLE_EPSILON &&
    Math.abs(state.width.position - target.width) <= SETTLE_EPSILON &&
    Math.abs(state.height.position - target.height) <= SETTLE_EPSILON &&
    Math.abs(state.radius.position - target.radius) <= SETTLE_EPSILON
  )
}

function closestTarget(target: EventTarget | null, selector: string): Element | null {
  return target instanceof Element ? target.closest(selector) : null
}

function readMagneticBounds(target: Element, view: Window): MagneticBounds {
  const bounds = target.getBoundingClientRect()
  const radius = Number.parseFloat(view.getComputedStyle(target).borderTopLeftRadius) || 0

  return {
    left: bounds.left,
    top: bounds.top,
    width: bounds.width,
    height: bounds.height,
    radius,
  }
}

function applyRingState(ring: HTMLSpanElement, state: RingState) {
  ring.style.transform = `translate3d(${state.x.position}px, ${state.y.position}px, 0)`

  const width = `${state.width.position}px`
  const height = `${state.height.position}px`
  const radius = `${state.radius.position}px`
  if (ring.style.width !== width) ring.style.width = width
  if (ring.style.height !== height) ring.style.height = height
  if (ring.style.borderRadius !== radius) ring.style.borderRadius = radius
}

function translateDot(dot: HTMLSpanElement, pointer: { readonly x: number; readonly y: number }, pressed: boolean) {
  const scale = pressed ? 0.72 : 1
  dot.style.transform = `translate3d(${pointer.x - 3}px, ${pointer.y - 3}px, 0) scale(${scale})`
}

export function installMagneticCursor(
  elements: CursorElements,
  doc: Document = document,
  view: Window = window,
): () => void {
  if (typeof view.matchMedia !== 'function') return () => undefined

  const pointerMedia = view.matchMedia(POINTER_QUERY)
  const reducedMotionMedia = view.matchMedia(REDUCED_MOTION_QUERY)
  let unmountActive: (() => void) | null = null

  const mountActive = () => {
    let pointer = { x: -100, y: -100 }
    let ringState = createRingState(resolveRingTarget(pointer))
    let magneticBounds: MagneticBounds | null = null
    let activeMagneticTarget: Element | null = null
    let activeTextTarget: Element | null = null
    let pressed = false
    let visible = false
    let frameId: number | null = null

    const updatePointerMode = (target: EventTarget | null) => {
      const nextTextTarget = closestTarget(target, TEXT_SELECTOR)
      const nextMagneticTarget = nextTextTarget
        ? null
        : closestTarget(target, INTERACTIVE_SELECTOR)

      if (
        nextTextTarget === activeTextTarget &&
        nextMagneticTarget === activeMagneticTarget
      ) {
        return false
      }

      activeTextTarget = nextTextTarget
      activeMagneticTarget = nextMagneticTarget
      magneticBounds = nextMagneticTarget ? readMagneticBounds(nextMagneticTarget, view) : null
      elements.cursor.classList.toggle(styles.isText, Boolean(nextTextTarget))
      elements.cursor.classList.toggle(styles.magnetic, Boolean(nextMagneticTarget))
      return true
    }

    const tick = () => {
      frameId = null
      if (!visible) return

      const target = resolveRingTarget(pointer, magneticBounds)
      const nextState = stepRingState(ringState, target)
      const settled = isRingSettled(nextState, target)
      ringState = settled ? createRingState(target) : nextState
      applyRingState(elements.ring, ringState)

      if (!settled) frameId = view.requestAnimationFrame(tick)
    }

    const scheduleFrame = () => {
      if (visible && frameId === null) frameId = view.requestAnimationFrame(tick)
    }

    const onMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY }
      const modeChanged = updatePointerMode(event.target)
      translateDot(elements.dot, pointer, pressed)

      if (!visible) {
        visible = true
        ringState = createRingState(resolveRingTarget(pointer, magneticBounds))
        applyRingState(elements.ring, ringState)
        elements.cursor.classList.add(styles.visible)
        return
      }

      if (modeChanged || !magneticBounds) scheduleFrame()
    }
    const setPressed = (nextPressed: boolean) => {
      pressed = nextPressed
      translateDot(elements.dot, pointer, pressed)
    }
    const press = () => setPressed(true)
    const release = () => setPressed(false)
    const hide = () => {
      visible = false
      if (frameId !== null) view.cancelAnimationFrame(frameId)
      frameId = null
      elements.cursor.classList.remove(styles.visible)
    }
    const clearMagneticBounds = () => {
      if (!activeMagneticTarget) return

      activeMagneticTarget = null
      magneticBounds = null
      elements.cursor.classList.remove(styles.magnetic)
      scheduleFrame()
    }

    doc.addEventListener('pointermove', onMove, { passive: true })
    doc.addEventListener('pointerdown', press, { passive: true })
    doc.addEventListener('pointerup', release, { passive: true })
    doc.addEventListener('pointercancel', release, { passive: true })
    doc.documentElement.addEventListener('pointerleave', hide)
    view.addEventListener('blur', hide)
    view.addEventListener('scroll', clearMagneticBounds, { passive: true })
    view.addEventListener('resize', clearMagneticBounds, { passive: true })
    doc.documentElement.classList.add('cursor-enhanced')

    return () => {
      if (frameId !== null) view.cancelAnimationFrame(frameId)
      doc.removeEventListener('pointermove', onMove)
      doc.removeEventListener('pointerdown', press)
      doc.removeEventListener('pointerup', release)
      doc.removeEventListener('pointercancel', release)
      doc.documentElement.removeEventListener('pointerleave', hide)
      view.removeEventListener('blur', hide)
      view.removeEventListener('scroll', clearMagneticBounds)
      view.removeEventListener('resize', clearMagneticBounds)
      doc.documentElement.classList.remove('cursor-enhanced')
      elements.cursor.classList.remove(styles.visible, styles.magnetic, styles.isText)
    }
  }

  const sync = () => {
    const eligible = isCursorEligible({
      pointer: pointerMedia.matches,
      reducedMotion: reducedMotionMedia.matches,
    })

    if (eligible && !unmountActive) unmountActive = mountActive()
    if (!eligible && unmountActive) {
      unmountActive()
      unmountActive = null
    }
  }

  pointerMedia.addEventListener('change', sync)
  reducedMotionMedia.addEventListener('change', sync)
  sync()

  return () => {
    pointerMedia.removeEventListener('change', sync)
    reducedMotionMedia.removeEventListener('change', sync)
    unmountActive?.()
  }
}

export function CinematicCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLSpanElement>(null)
  const dotRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const cursor = cursorRef.current
    const ring = ringRef.current
    const dot = dotRef.current
    if (!cursor || !ring || !dot) return

    return installMagneticCursor({ cursor, ring, dot })
  }, [])

  return (
    <div ref={cursorRef} className={styles.cursor} aria-hidden="true">
      <span ref={ringRef} className={styles.ring} />
      <span ref={dotRef} className={styles.dot} />
    </div>
  )
}
