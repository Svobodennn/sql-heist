// Tiny conditional-classname joiner — the shared UI utility both the app shell and
// the game feature compose CSS-Module + global classes with. The project has no
// Tailwind, so clsx + tailwind-merge would add nothing; this is the dependency-free
// equivalent. Lives in the shared `ui/` layer so neither app nor features owns it.
export type ClassValue = string | number | false | null | undefined

export function cx(...values: ClassValue[]): string {
  return values.filter((v): v is string | number => Boolean(v)).join(' ')
}
