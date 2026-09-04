'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

interface RevealOptions {
  readonly reducedMotion?: boolean
  readonly Observer?: typeof IntersectionObserver
}

function reveal(target: Element, observer: IntersectionObserver) {
  target.setAttribute('data-reveal-visible', 'true')
  observer.unobserve(target)
}

export function installScrollReveal(root: HTMLElement, options: RevealOptions = {}): () => void {
  const view = root.ownerDocument.defaultView
  const reducedMotion =
    options.reducedMotion ??
    (view && typeof view.matchMedia === 'function'
      ? view.matchMedia('(prefers-reduced-motion: reduce)').matches
      : true)
  const Observer = options.Observer ?? view?.IntersectionObserver
  const targets = [...root.querySelectorAll<HTMLElement>('[data-reveal]')]

  if (reducedMotion || !Observer || targets.length === 0) return () => undefined

  root.setAttribute('data-motion-ready', 'true')
  const observer = new Observer(
    (entries) => {
      entries
        .filter((entry) => entry.isIntersecting)
        .forEach((entry) => reveal(entry.target, observer))
    },
    { rootMargin: '0px 0px -7% 0px', threshold: 0.1 },
  )

  targets.forEach((target) => observer.observe(target))

  const onFocus = (event: FocusEvent) => {
    const focused = event.target instanceof Element ? event.target : null
    const target = focused?.closest('[data-reveal]')
    if (target && root.contains(target)) reveal(target, observer)
  }
  root.addEventListener('focusin', onFocus)

  return () => {
    root.removeEventListener('focusin', onFocus)
    observer.disconnect()
    root.removeAttribute('data-motion-ready')
  }
}

export function ScrollReveal() {
  const markerRef = useRef<HTMLSpanElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    const root = markerRef.current?.parentElement
    if (!root) return
    return installScrollReveal(root)
  }, [pathname])

  return <span ref={markerRef} hidden aria-hidden="true" />
}
