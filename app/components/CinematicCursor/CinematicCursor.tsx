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
  ring.style.width = `${state.width.position}px`
  ring.style.height = `${state.height.position}px`
  ring.style.borderRadius = `${state.radius.position}px`
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
    let pressed = false
    let visible = false
    let frameId = 0

    const updatePointerMode = (target: EventTarget | null) => {
      const textTarget = closestTarget(target, TEXT_SELECTOR)
      const magneticTarget = textTarget ? null : closestTarget(target, INTERACTIVE_SELECTOR)

      magneticBounds = magneticTarget ? readMagneticBounds(magneticTarget, view) : null
      elements.cursor.classList.toggle(styles.isText, Boolean(textTarget))
      elements.cursor.classList.toggle(styles.magnetic, Boolean(magneticTarget))
    }

    const onMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY }
      updatePointerMode(event.target)
      translateDot(elements.dot, pointer, pressed)

      if (!visible) {
        visible = true
        ringState = createRingState(resolveRingTarget(pointer))
        elements.cursor.classList.add(styles.visible)
      }
    }
    const setPressed = (nextPressed: boolean) => {
      pressed = nextPressed
      translateDot(elements.dot, pointer, pressed)
    }
    const press = () => setPressed(true)
    const release = () => setPressed(false)
    const hide = () => {
      visible = false
      elements.cursor.classList.remove(styles.visible)
    }
    const clearMagneticBounds = () => {
      magneticBounds = null
      elements.cursor.classList.remove(styles.magnetic)
    }
    const tick = () => {
      ringState = stepRingState(ringState, resolveRingTarget(pointer, magneticBounds))
      applyRingState(elements.ring, ringState)
      frameId = view.requestAnimationFrame(tick)
    }

    doc.addEventListener('pointermove', onMove, { passive: true })
    doc.addEventListener('pointerdown', press, { passive: true })
    doc.addEventListener('pointerup', release, { passive: true })
    doc.addEventListener('pointercancel', release, { passive: true })
    doc.documentElement.addEventListener('pointerleave', hide)
    view.addEventListener('blur', hide)
    view.addEventListener('scroll', clearMagneticBounds, { passive: true })
    doc.documentElement.classList.add('cursor-enhanced')
    frameId = view.requestAnimationFrame(tick)

    return () => {
      view.cancelAnimationFrame(frameId)
      doc.removeEventListener('pointermove', onMove)
      doc.removeEventListener('pointerdown', press)
      doc.removeEventListener('pointerup', release)
      doc.removeEventListener('pointercancel', release)
      doc.documentElement.removeEventListener('pointerleave', hide)
      view.removeEventListener('blur', hide)
      view.removeEventListener('scroll', clearMagneticBounds)
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
