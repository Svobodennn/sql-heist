import type { SVGProps } from 'react'

// Language-category glyphs for the debrief secure-code selector (level 1). These
// are simple, monochrome, recognizable marks — NOT pixel-perfect brand logos —
// drawn with currentColor so they inherit the tab's token (muted -> jade when
// selected). They are decorative (aria-hidden): every glyph sits beside its
// visible language name, so the name carries the meaning and the color law is
// never on the icon alone. One clean glyph per engine language code; an unknown
// code falls back to a generic `</>` mark.

type GlyphProps = SVGProps<SVGSVGElement> & { size?: number }

function Glyph({ size = 20, children, ...rest }: GlyphProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

// JavaScript — the "JS" badge (outlined tile + lettermark).
function IconJs(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <rect x="2.75" y="2.75" width="18.5" height="18.5" rx="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <text
        x="12"
        y="13"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--font-mono)"
        fontSize="9"
        fontWeight={700}
      >
        JS
      </text>
    </Glyph>
  )
}

// Python — a coiled snake with a forked tongue.
function IconPython(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <path
        d="M7.5 20.5c3.2 0 4.3-2.4 4.3-4.9 0-2.4-3.3-2.6-3.3-5.1 0-2.6 2.3-5 6.5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="15.4" cy="5.5" r="2.3" />
      <path
        d="M17.6 5.5h2.4M17.9 5.5l1.9-1.2M17.9 5.5l1.9 1.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Glyph>
  )
}

// PHP — the "php" wordmark inside the classic elongated frame.
function IconPhp(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <ellipse cx="12" cy="12" rx="10.5" ry="6.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text
        x="12"
        y="12.4"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--font-mono)"
        fontSize="7.5"
        fontWeight={700}
        fontStyle="italic"
      >
        php
      </text>
    </Glyph>
  )
}

// Java — steaming coffee cup.
function IconJava(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <path
        d="M9 2.4c1 1-1 2 0 3.3M12.6 2.4c1 1-1 2 0 3.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M5 9h10v4a5 5 0 0 1-5 5 5 5 0 0 1-5-5z" />
      <path
        d="M15 10h2.4a2.5 2.5 0 0 1 0 5h-1.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M4 20.7h12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Glyph>
  )
}

// C# — the lettermark (sharp sign included).
function IconCsharp(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <text
        x="12"
        y="12.6"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--font-mono)"
        fontSize="11"
        fontWeight={700}
      >
        C#
      </text>
    </Glyph>
  )
}

// Go — the slanted "Go" wordmark.
function IconGo(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <text
        x="12"
        y="12.6"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--font-mono)"
        fontSize="11"
        fontWeight={700}
        fontStyle="italic"
      >
        Go
      </text>
    </Glyph>
  )
}

// Ruby — a faceted cut gem.
function IconRuby(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <path
        d="M7 3.5h10l4 5.5-9 11.5L3 9z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M3 9h18M8.5 3.5 7 9l5 11.5M15.5 3.5 17 9l-5 11.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </Glyph>
  )
}

// Fallback — generic code mark for unknown/legacy language codes.
function IconCode(p: GlyphProps) {
  return (
    <Glyph {...p}>
      <path
        d="M8.5 7 3.5 12l5 5M15.5 7l5 5-5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Glyph>
  )
}

const LANG_ICONS: Record<string, (props: GlyphProps) => React.ReactElement> = {
  js: IconJs,
  python: IconPython,
  php: IconPhp,
  java: IconJava,
  csharp: IconCsharp,
  go: IconGo,
  ruby: IconRuby,
}

export function LangIcon({ code, ...rest }: GlyphProps & { code: string }) {
  const Icon = LANG_ICONS[code] ?? IconCode
  return <Icon {...rest} />
}
