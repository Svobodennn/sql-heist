import type { ReactNode, SVGProps } from 'react'

// Generic UI icons shared by BOTH the app shell and the game feature — one
// definition here (was duplicated in app/components/icons + features/game/components/icons).
// Anti-emoji policy: 24×24 viewBox, currentColor stroke, 1.75 weight; decorative
// by default (aria-hidden). Each side re-exports these from its own icons module,
// so consumers keep importing from `../icons` unchanged.
type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Base({ size = 18, children, ...rest }: IconProps & { children: ReactNode }) {
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

export const IconArrowRight = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Base>
)

export const IconBoard = (p: IconProps) => (
  <Base {...p}>
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" />
  </Base>
)

export const IconCheck = (p: IconProps) => (
  <Base {...p}>
    <path d="m4 12 5 5L20 6" />
  </Base>
)

export const IconChevronDown = (p: IconProps) => (
  <Base {...p}>
    <path d="m6 9 6 6 6-6" />
  </Base>
)

export const IconGlobe = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M4 12h16M12 4c2.5 2.5 2.5 13 0 16M12 4c-2.5 2.5-2.5 13 0 16" />
  </Base>
)

export const IconUser = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </Base>
)
