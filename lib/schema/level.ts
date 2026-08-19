import { z } from 'zod'

// Canonical level schema — docs/01-architecture.md §4 (+ §5.2 win DSL). Field
// names/types are architect-locked ([E] = engine-consumed). This module OWNS
// these types; the engine and content both import from here. Zod doubles as the
// build/dev validation gate: an invalid level JSON throws (parseLevel).

// A single result cell (§3.2). Defined here because the canonical WinCondition
// (row-match.expect) references it and everything else depends on the schema —
// keeping it here avoids an engine -> schema -> engine import cycle. Uint8Array
// never appears in level JSON (BLOBs only surface at query time), but the type
// stays faithful to the runner's SqlCell.
export const sqlCellSchema = z.union([
  z.string(),
  z.number(),
  z.instanceof(Uint8Array),
  z.null(),
])
// Explicit alias (docs §3.2 canonical) rather than z.infer: sql.js types bare
// `Uint8Array` (= Uint8Array<ArrayBufferLike>), but z.instanceof infers the
// narrower Uint8Array<ArrayBuffer>, which would make the real Database not
// assignable to the runner's SqlDatabase under TS's generic-typed-array lib.
export type SqlCell = string | number | Uint8Array | null

// Curriculum techniques (§4). First five are MVP; the WS3 block below extends the
// vocabulary for post-MVP jobs (engine/QA classification only — additive).
export const techniqueIdSchema = z.enum([
  'auth-bypass',
  'comment-injection',
  'column-count',
  'union-extraction',
  'schema-discovery',
  // WS3 post-MVP:
  'error-based',
  'blind-boolean',
  'blind-timing',
  'stacked-queries',
  'waf-bypass',
])
export type TechniqueId = z.infer<typeof techniqueIdSchema>

// Which mimic UI the recon/exploit surface renders (§4, §6).
export const surfaceKindSchema = z.enum([
  'login-form',
  'search-box',
  'url-param',
  'profile-lookup',
])
export type SurfaceKind = z.infer<typeof surfaceKindSchema>

export const inputFieldSchema = z.object({
  name: z.string().min(1), // template token: {{input:name}}
  label: z.string(),
  type: z.enum(['text', 'password', 'search', 'number']),
  placeholder: z.string().optional(),
})
export type InputField = z.infer<typeof inputFieldSchema>

export const visibleTableSchema = z.object({
  table: z.string(),
  columns: z.array(z.string()),
})
export type VisibleTable = z.infer<typeof visibleTableSchema>

export const codeSnippetSchema = z.object({
  language: z.string(),
  code: z.string(),
})
export type CodeSnippet = z.infer<typeof codeSnippetSchema>

// WS2: per-stack secure fix. A level may ship ONE secure snippet (legacy object
// form, below) or an ARRAY of stack-tagged snippets (id/label pick the tab).
// `language`/`code` mirror CodeSnippet so a single element renders identically.
export const secureSnippetSchema = z.object({
  id: z.string(),
  label: z.string(),
  language: z.string(),
  code: z.string(),
})
export type SecureSnippet = z.infer<typeof secureSnippetSchema>

export const hintSchema = z.object({
  id: z.string(),
  text: z.string(),
  cost: z.number().optional(),
  revealAfterAttempts: z.number().optional(),
})
export type Hint = z.infer<typeof hintSchema>

// WS3: optional WAF-style filter applied to RAW input at compose time, BEFORE
// substitution. Absent => zero behavior change (the injection contract is
// otherwise unchanged). 'reject' blocks the whole run; 'strip' removes the
// blocked substrings and runs the neutered input. Matching is case-insensitive.
export const inputFilterSchema = z.object({
  blocklist: z.array(z.string()).min(1),
  mode: z.enum(['reject', 'strip']),
  message: z.string().optional(),
})
export type InputFilter = z.infer<typeof inputFilterSchema>

// [C] planner-owned values; architect reserves the field/shape (§4, §6.4).
export const scoringConfigSchema = z.object({
  basePoints: z.number().optional(),
  hintPenalty: z.number().optional(),
  timeBonus: z.boolean().optional(),
})
export type ScoringConfig = z.infer<typeof scoringConfigSchema>

// Win-condition DSL (§5.2) — discriminated union on `type`.
export const winConditionSchema = z.discriminatedUnion('type', [
  // (1) auth bypass: query returned a row count within range.
  z.object({
    type: z.literal('rows-returned'),
    min: z.number(),
    max: z.number().optional(),
    reason: z.string().optional(),
  }),
  // (2) hidden flag surfaced in the result grid (UNION extraction / discovery).
  z.object({
    type: z.literal('flag-in-result'),
    flag: z.string(),
    column: z.string().optional(),
    caseSensitive: z.boolean().optional(),
    // Anti-echo guard: the composed SQL must reference every token (e.g. the source
    // table / sqlite_master), so a player can't win by SELECTing the flag as a literal
    // constant without performing the extraction. Same contract as the blind/stacked types.
    mustReference: z.array(z.string()).min(1).optional(),
    reason: z.string().optional(),
  }),
  // (3) target row(s) present. subset = row may carry extra columns; exact = 1:1.
  z.object({
    type: z.literal('row-match'),
    expect: z.array(z.record(z.string(), sqlCellSchema)),
    mode: z.enum(['subset', 'exact']),
    reason: z.string().optional(),
  }),
  // ---- WS3 post-MVP win types (all PURE + deterministic + golden-testable) ----
  // (4) error-based: a TARGETED SQLite error IS the win (data leaks through the
  //     message). Evaluated BEFORE the anti-trivial error guard (§5.3), ONLY for
  //     this type. errorContains scopes it to a specific error signature.
  z.object({
    type: z.literal('error-based'),
    errorContains: z.string().optional(),
    reason: z.string().optional(),
  }),
  // (5) blind-boolean: the TRUE branch of a boolean oracle fired (a row came
  //     back). Differentiation TRUE↔FALSE is proven at the level (solve wins,
  //     benign/false returns 0 rows -> anti-trivial loss).
  z.object({
    type: z.literal('blind-boolean'),
    // The composed SQL must reference ALL of these (case-insensitive) for the win
    // to count. Without it a blanket tautology (' OR 1=1) returns rows and "wins"
    // a blind level without interrogating the secret. Absent => bit-only (legacy).
    mustReference: z.array(z.string()).min(1).optional(),
    reason: z.string().optional(),
  }),
  // (6) blind-timing: timing oracle modeled SYMBOLICALLY. sql.js is synchronous,
  //     so we do NOT measure wall-clock (durationMs is ignored); the oracle's
  //     TRUE state is modeled as a returned row, same signal as blind-boolean.
  //     thresholdMs/slowDelayMs tune ONLY the modeled timing SIGNAL (the meter in
  //     deriveSignal); evaluation still ignores time. Optional — signal.ts defaults.
  z.object({
    type: z.literal('blind-timing'),
    thresholdMs: z.number().optional(),
    slowDelayMs: z.number().optional(),
    // Same oracle guard as blind-boolean: the slow branch must hinge on the
    // secret, not a blanket always-true condition. Absent => bit-only (legacy).
    mustReference: z.array(z.string()).min(1).optional(),
    reason: z.string().optional(),
  }),
  // (7) stacked-queries: a multi-statement payload's side effect is observable
  //     as an EXTRA result set (the app query yields N sets; a stacked read/verify
  //     yields more). minResultSets defaults to 2.
  z.object({
    type: z.literal('stacked-queries'),
    minResultSets: z.number().optional(),
    // Oracle-style guard (same as blind types): the composed SQL must reference
    // ALL of these (case-insensitive), so a throwaway second statement (';SELECT 1)
    // can't "win" a job whose point is a specific stacked side effect. Absent =>
    // any extra result set counts (legacy).
    mustReference: z.array(z.string()).min(1).optional(),
    reason: z.string().optional(),
  }),
])
export type WinCondition = z.infer<typeof winConditionSchema>

// Shared with the Case/Objective model (docs/cases-design.md) — extracted so Level
// and Objective reuse one definition instead of duplicating the shape.
export const difficultySchema = z.enum(['intro', 'easy', 'medium', 'hard'])
export type Difficulty = z.infer<typeof difficultySchema>

// The "fix" beat: the flaw + its parameterized rewrite, optionally per stack.
export const debriefSchema = z.object({
  explanation: z.string(),
  vulnerableCode: codeSnippetSchema,
  vulnerableCodeVariants: z.array(secureSnippetSchema).min(1).optional(),
  secureCode: codeSnippetSchema,
  secureCodeVariants: z.array(secureSnippetSchema).min(1).optional(),
  takeaway: z.string(),
})
export type Debrief = z.infer<typeof debriefSchema>

export const levelSchema = z.object({
  // ---- identity & meta ----
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  order: z.number(),
  job: z.string(),
  title: z.string(),
  technique: techniqueIdSchema,
  difficulty: difficultySchema,

  // ---- narrative ----
  brief: z.object({
    handler: z.string(),
    text: z.string(),
    objective: z.string(),
  }),
  debrief: debriefSchema,

  // ---- target surface (recon + input) ----
  target: z.object({
    appName: z.string(),
    surface: surfaceKindSchema,
    fields: z.array(inputFieldSchema),
  }),

  // ---- fresh DB (schema + seed + recon-visible schema) ----
  database: z.object({
    schemaSql: z.string(),
    seedSql: z.string(),
    visibleSchema: z.array(visibleTableSchema),
  }),

  // ---- vulnerable query (heart of the injection, §3) ----
  query: z.object({
    template: z.string(),
    description: z.string().optional(),
    inputFilter: inputFilterSchema.optional(), // WS3 WAF (absent => no change)
  }),

  // ---- win condition (DSL, §5) ----
  winCondition: winConditionSchema,

  // ---- hints / solution / scoring ----
  hints: z.array(hintSchema),
  expectedSolution: z.object({
    inputs: z.record(z.string(), z.string()),
    note: z.string().optional(),
  }),
  scoring: scoringConfigSchema.optional(),

  tags: z.array(z.string()).optional(),
})
export type Level = z.infer<typeof levelSchema>

// Build/dev validation gate: throws (ZodError) on an invalid level. Load-time
// callers use this so a malformed level JSON fails the build instead of shipping.
export function parseLevel(data: unknown): Level {
  return levelSchema.parse(data)
}

export function safeParseLevel(data: unknown) {
  return levelSchema.safeParse(data)
}

// WS2 adapter: collapse either secure-fix form into a stable SecureSnippet[].
// Legacy object (debrief.secureCode) -> a single 'default' snippet; the per-stack
// array (debrief.secureCodeVariants) passes through as-is. Pure; the UI renders
// one tab per element. Call as: normalizeSecureCode(secureCodeVariants ?? secureCode).
export function normalizeSecureCode(
  sc: CodeSnippet | SecureSnippet[],
): SecureSnippet[] {
  if (Array.isArray(sc)) return sc
  return [{ id: 'default', label: 'Secure', language: sc.language, code: sc.code }]
}
