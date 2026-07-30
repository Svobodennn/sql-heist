import type { ReactNode, SVGProps } from 'react'

// App-shell icon set (anti-emoji policy). Zone-local so the site chrome never
// imports from features/game. Same visual language as the game icons: 24x24
// viewBox, currentColor stroke, 1.75 weight — decorative by default (aria-hidden).
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

export const IconMenu = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Base>
)

export const IconClose = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Base>
)

export const IconGlobe = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M4 12h16M12 4c2.5 2.5 2.5 13 0 16M12 4c-2.5 2.5-2.5 13 0 16" />
  </Base>
)

export const IconChevronDown = (p: IconProps) => (
  <Base {...p}>
    <path d="m6 9 6 6 6-6" />
  </Base>
)

export const IconArrowRight = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Base>
)

export const IconCheck = (p: IconProps) => (
  <Base {...p}>
    <path d="m4 12 5 5L20 6" />
  </Base>
)

// Share = a link handed off (node + outgoing arc).
export const IconShare = (p: IconProps) => (
  <Base {...p}>
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="17" cy="6" r="2.5" />
    <circle cx="17" cy="18" r="2.5" />
    <path d="m8.2 10.8 6.6-3.6M8.2 13.2l6.6 3.6" />
  </Base>
)

export const IconLink = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 15 15 9" />
    <path d="M11 6.5 12.5 5a4 4 0 0 1 5.5 5.5L16.5 12" />
    <path d="M13 17.5 11.5 19A4 4 0 0 1 6 13.5L7.5 12" />
  </Base>
)

// Sign-in entry point (stub → WS5).
export const IconUser = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </Base>
)

export const IconMail = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.5 6.5 8.5 6 8.5-6" />
  </Base>
)

// ---- Primary-nav leading icons (decorative; the link text is the label) ----

// Home = a house.
export const IconHome = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 10.75 12 4l9 6.75" />
    <path d="M5.5 9.5V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5" />
    <path d="M9.75 20v-5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75v5" />
  </Base>
)

// Jobs = "The Board": a 2×2 grid of job cards.
export const IconBoard = (p: IconProps) => (
  <Base {...p}>
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" />
  </Base>
)

// Help = a question mark in a circle.
export const IconHelpCircle = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.2 9.3a3 3 0 0 1 5.6 1c0 2-2.8 2.5-2.8 4" />
    <path d="M12 17.3h.01" />
  </Base>
)
