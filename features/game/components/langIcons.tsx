import type { SVGProps } from 'react'

// Language-category glyphs for the debrief secure-code selector (level 1). They
// stay monochrome and use currentColor so they inherit the tab's token (muted ->
// jade when selected); Python keeps the official PSF silhouette within that visual
// system. They are decorative (aria-hidden): every glyph sits beside its visible
// language name, so the name carries the meaning and the color law is never on the
// icon alone. An unknown code falls back to a generic `</>` mark.

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

// Python — the PSF's official two-snake silhouette, kept monochrome so it follows
// the same muted -> jade selector treatment as every other language glyph.
// Source geometry: https://www.python.org/community/logos/
function IconPython(p: GlyphProps) {
  return (
    <Glyph {...p} size={15} viewBox="0 0 110.42 110.42">
      <path
        d="M54.918785.000919C50.335132.022217 45.957846.413137 42.106285 1.094669 30.760069 3.099173 28.700036 7.294771 28.700035 15.032169v10.21875h26.8125v3.40625h-36.875c-7.792459 0-14.615759 4.683717-16.75 13.59375-2.46182 10.212966-2.571015 16.586023 0 27.25 1.905928 7.937852 6.457543 13.593748 14.25 13.59375h9.21875v-12.25c0-8.849902 7.657144-16.656248 16.75-16.65625h26.78125c7.454951 0 13.406253-6.138164 13.40625-13.625v-25.53125c0-7.266339-6.12998-12.724777-13.40625-13.9375C64.281548.327944 59.502438-.020379 54.918785.000919ZM40.418785 8.219669c2.769547 0 5.03125 2.298646 5.03125 5.125 0 2.816336-2.261703 5.09375-5.03125 5.09375-2.779476 0-5.03125-2.277415-5.03125-5.09375 0-2.826353 2.251774-5.125 5.03125-5.125Z"
        fill="currentColor"
      />
      <path
        d="M85.637535 28.657169v11.90625c0 9.230755-7.825895 16.999999-16.75 17h-26.78125c-7.335833 0-13.406249 6.278483-13.40625 13.625v25.531247c0 7.266344 6.318588 11.540324 13.40625 13.625004 8.487331 2.49561 16.626237 2.94663 26.78125 0 6.750155-1.95439 13.406253-5.88761 13.40625-13.625004V86.500919h-26.78125v-3.40625h40.187504c7.792461 0 10.696251-5.435408 13.406241-13.59375 2.79933-8.398886 2.68022-16.475776 0-27.25-1.92578-7.757441-5.60387-13.59375-13.406241-13.59375ZM70.575035 93.313419c2.779478 0 5.03125 2.277417 5.03125 5.093747 0 2.826354-2.251775 5.125004-5.03125 5.125004-2.76955 0-5.03125-2.29865-5.03125-5.125004 0-2.81633 2.261697-5.093747 5.03125-5.093747Z"
        fill="currentColor"
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
