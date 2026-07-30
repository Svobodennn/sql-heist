import type { SVGProps } from 'react'

// Inline SVG icon set (anti-emoji policy). Icons carry MEANING alongside color +
// label + position so the semantic color law never relies on color alone
// (WCAG 1.4.1 — critical for the crimson/jade colorblind pair). currentColor
// inherits the surrounding token; decorative by default (aria-hidden).

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Base({ size = 18, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

// Generic icons shared with the app shell live in the ui/ layer (one source).
export { IconArrowRight, IconBoard, IconCheck, IconChevronDown, IconGlobe } from '@/ui/icons'

export const IconLock = (p: IconProps) => (
  <Base {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Base>
)

// Broken lock = VULNERABLE (shackle sprung open, tilted).
export const IconLockBroken = (p: IconProps) => (
  <Base {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 7-2.6" />
    <path d="M17 4.5 19.5 7" />
  </Base>
)

export const IconTimer = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="13" r="7" />
    <path d="M12 13V9M9 3h6" />
  </Base>
)

export const IconTarget = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3" />
  </Base>
)

export const IconAlert = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3 2 20h20L12 3Z" />
    <path d="M12 9v5M12 17h.01" />
  </Base>
)

export const IconBulb = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.4 1 2.5h6c0-1.1.4-1.9 1-2.5A6 6 0 0 0 12 3Z" />
  </Base>
)

export const IconArrowLeft = (p: IconProps) => (
  <Base {...p}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </Base>
)

export const IconVolume = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 9v6h4l5 4V5L8 9H4Z" />
    <path d="M16 9a4 4 0 0 1 0 6" />
  </Base>
)

export const IconMute = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 9v6h4l5 4V5L8 9H4Z" />
    <path d="m22 9-5 6M17 9l5 6" />
  </Base>
)

export const IconStar = ({ filled = false, ...p }: IconProps & { filled?: boolean }) => (
  <Base {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 3.5 14.6 9l6 .8-4.4 4.1 1.1 5.9L12 17l-5.3 2.8 1.1-5.9L3.4 9.8 9.4 9 12 3.5Z" />
  </Base>
)

export const IconLootTag = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 12 11 4h8v8l-8 8-8-8Z" />
    <circle cx="15.5" cy="8.5" r="1.4" />
  </Base>
)

// Plain X — oracle FALSE (paired with the word "FALSE", never color-only).
export const IconX = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Base>
)

// Prohibition / no-entry — the WAF REJECT banner (semantic stand-in for ⛔,
// honoring the codebase anti-emoji policy).
export const IconBlock = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m5.6 5.6 12.8 12.8" />
  </Base>
)

// Scissors — the WAF STRIP banner ("cleaned → your input became …").
export const IconScissors = (p: IconProps) => (
  <Base {...p}>
    <circle cx="6" cy="6" r="2.5" />
    <circle cx="6" cy="18" r="2.5" />
    <path d="M8 8l12 8M8 16 20 8" />
  </Base>
)

// Stacked layers — the stacked-queries side-effect readout.
export const IconStack = (p: IconProps) => (
  <Base {...p}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </Base>
)

// Open notebook — the recon discovery ledger.
export const IconNotebook = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 6c-2-1.4-4.5-1.4-7-1v13c2.5-.4 5-.4 7 1 2-1.4 4.5-1.4 7-1V5c-2.5-.4-5-.4-7 1Z" />
    <path d="M12 6v14" />
  </Base>
)

// Award medal — the per-technique mastery badges.
export const IconAward = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="9" r="5" />
    <path d="M9 13.5 7.5 21 12 18.5 16.5 21 15 13.5" />
  </Base>
)
