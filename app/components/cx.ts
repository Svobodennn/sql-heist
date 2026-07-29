// Zone-local classname joiner. The app-shell keeps its own copy (instead of
// importing features/game/lib/cx) so this track stays decoupled from the game
// internals — no cross-zone imports, no merge coupling with the Wave-2 work.
export type ClassValue = string | number | false | null | undefined

export function cx(...values: ClassValue[]): string {
  return values.filter((v): v is string | number => Boolean(v)).join(' ')
}
