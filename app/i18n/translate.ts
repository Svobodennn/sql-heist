// Framework-agnostic translation core. No React, no browser APIs — so it runs in
// the node vitest env and in both Server and Client Components. A message catalog
// is a nested tree; keys are dot paths ("nav.home", "game.hint.unlocked"). Values
// may carry {placeholders} filled from an optional vars map at call time.
//
// Design note (static export): `en` is the DEFAULT locale AND the fallback, so a
// missing/late key always renders the English string — the app never shows a raw
// key to a player, and the default-locale output stays byte-identical to the
// pre-i18n build.

export type MessageTree = { [key: string]: string | MessageTree }

export type TranslateVars = Record<string, string | number>

export type Translator = (key: string, vars?: TranslateVars) => string

// Fill {name} placeholders. A token with no matching var is left literal (so a
// stray `{x}` degrades visibly instead of throwing), and strings without braces
// return unchanged — the common case pays nothing.
function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars || template.indexOf('{') === -1) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  )
}

// Walk a dot path. Returns the interpolated string, or undefined if the path does
// not resolve to a string (missing, or lands on a subtree) — the caller decides
// how to fall back.
export function lookup(tree: MessageTree, key: string, vars?: TranslateVars): string | undefined {
  let node: string | MessageTree | undefined = tree
  for (const segment of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined
    node = node[segment]
  }
  return typeof node === 'string' ? interpolate(node, vars) : undefined
}

// Bind a translator to a primary catalog with a fallback catalog (always `en`).
// Resolution order: primary → fallback → the key itself (last-resort, so an
// unknown key is obvious in the UI rather than blank).
export function createTranslator(primary: MessageTree, fallback: MessageTree): Translator {
  return (key, vars) => {
    const hit = lookup(primary, key, vars)
    if (hit !== undefined) return hit
    const fell = lookup(fallback, key, vars)
    if (fell !== undefined) return fell
    return key
  }
}
