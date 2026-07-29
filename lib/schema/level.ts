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

// MVP curriculum techniques (§4). v1 techniques stay commented in the doc.
export const techniqueIdSchema = z.enum([
  'auth-bypass',
  'comment-injection',
  'column-count',
  'union-extraction',
  'schema-discovery',
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

export const hintSchema = z.object({
  id: z.string(),
  text: z.string(),
  cost: z.number().optional(),
  revealAfterAttempts: z.number().optional(),
})
export type Hint = z.infer<typeof hintSchema>

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
    reason: z.string().optional(),
  }),
  // (3) target row(s) present. subset = row may carry extra columns; exact = 1:1.
  z.object({
    type: z.literal('row-match'),
    expect: z.array(z.record(z.string(), sqlCellSchema)),
    mode: z.enum(['subset', 'exact']),
    reason: z.string().optional(),
  }),
])
export type WinCondition = z.infer<typeof winConditionSchema>

export const levelSchema = z.object({
  // ---- identity & meta ----
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  order: z.number(),
  job: z.string(),
  title: z.string(),
  technique: techniqueIdSchema,
  difficulty: z.enum(['intro', 'easy', 'medium', 'hard']),

  // ---- narrative ----
  brief: z.object({
    handler: z.string(),
    text: z.string(),
    objective: z.string(),
  }),
  debrief: z.object({
    explanation: z.string(),
    vulnerableCode: codeSnippetSchema,
    secureCode: codeSnippetSchema,
    takeaway: z.string(),
  }),

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
