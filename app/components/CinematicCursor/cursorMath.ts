export interface FollowAxisState {
  readonly position: number
  readonly velocity: number
}

export interface PointerPosition {
  readonly x: number
  readonly y: number
}

export interface MagneticBounds {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
  readonly radius: number
}

export interface RingTarget {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly radius: number
}

export interface CursorEligibility {
  readonly pointer: boolean
  readonly reducedMotion: boolean
}

const RING_RADIUS = 17
const FOLLOW_EASING = 0.18

export function stepFollowAxis(
  current: FollowAxisState,
  target: number,
  easing = FOLLOW_EASING,
): FollowAxisState {
  const position = current.position + (target - current.position) * easing

  return {
    position,
    velocity: position - current.position,
  }
}

export function resolveRingTarget(
  pointer: PointerPosition,
  bounds: MagneticBounds | null = null,
  padding = 8,
): RingTarget {
  if (!bounds) {
    return {
      x: pointer.x - RING_RADIUS,
      y: pointer.y - RING_RADIUS,
      width: RING_RADIUS * 2,
      height: RING_RADIUS * 2,
      radius: RING_RADIUS,
    }
  }

  return {
    x: bounds.left - padding,
    y: bounds.top - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
    radius: bounds.radius + padding,
  }
}

export function isCursorEligible({ pointer, reducedMotion }: CursorEligibility): boolean {
  return pointer && !reducedMotion
}
