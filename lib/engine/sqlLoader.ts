import initSqlJs, { type SqlJsStatic } from 'sql.js'

// STUB (P0): proves the SQLite WASM boots under static export. P1/kraken owns the
// full engine (composer/runner/evaluator/session) and may reshape this — kept
// deliberately small and side-effect-light so it stays cheap to replace.

// The WASM ships as a static asset from `public/` (docs/01-architecture.md §2.1).
// A fixed absolute path means the browser fetches it the same way from any route
// depth. Emscripten calls locateFile with the requested filename; we ignore it
// and always return this — the node- and browser-build binaries are identical.
const DEFAULT_WASM_PATH = '/sql-wasm.wasm'

export interface LoadSqlJsOptions {
  // Override where the runtime resolves the WASM. Production leaves this unset
  // (DEFAULT_WASM_PATH). Node/Vitest has no HTTP origin, so tests pass a
  // filesystem path here. First successful call wins (see singleton note).
  locateFile?: (file: string) => string
}

let cached: Promise<SqlJsStatic> | undefined

// initSqlJs compiles the SQLite WASM — expensive, so run it once and share the
// resolved module across every level session (docs §2.1 singleton, lazy).
export function loadSqlJs(options?: LoadSqlJsOptions): Promise<SqlJsStatic> {
  if (cached) return cached

  const locateFile = options?.locateFile ?? (() => DEFAULT_WASM_PATH)

  const boot = initSqlJs({ locateFile }).catch((error: unknown) => {
    // Never cache a rejected boot — a bad path or network blip must stay
    // retryable (docs §2.1: loading|ready|error + retry). Only a resolved
    // module becomes the singleton.
    if (cached === boot) cached = undefined
    throw error
  })

  cached = boot
  return cached
}
