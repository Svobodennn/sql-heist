// Tiny conditional-classname joiner. The project has no Tailwind, so the
// clsx + tailwind-merge `cn()` from the skill would add nothing here; this is
// the dependency-free equivalent for composing CSS-Module + global classes.
export type ClassValue = string | number | false | null | undefined

export function cx(...values: ClassValue[]): string {
  return values.filter((v): v is string | number => Boolean(v)).join(' ')
}
