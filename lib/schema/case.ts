import { z } from 'zod'
import {
  techniqueIdSchema,
  surfaceKindSchema,
  inputFieldSchema,
  visibleTableSchema,
  inputFilterSchema,
  winConditionSchema,
  hintSchema,
  difficultySchema,
  debriefSchema,
} from '@/lib/schema/level'

// Case / Objective model (docs/cases-design.md). A Case owns ONE persistent DB and
// the narrative wrapper; Objectives are ordered steps against that shared DB, each
// carrying an explicit goal / why / doneWhen so the ask is always legible. Additive:
// the frozen win-DSL, composer and runner are reused unchanged — an Objective is
// essentially a Level with the database hoisted up to the Case + the clarity fields.

export const objectiveSchema = z.object({
  id: z.string().min(1),
  order: z.number(),
  // The three legibility fields — always authored, always shown on screen.
  goal: z.string().min(1), // WHAT: one imperative line
  why: z.string().min(1), // WHY: the narrative stakes
  doneWhen: z.string().min(1), // HOW YOU KNOW: player-facing success signal
  // Shown on the per-objective payoff screen after a win: `got` = what you pulled
  // (short headline), `fixer` = the Fixer's "now we can…" line that chains forward.
  payoff: z.object({ got: z.string().min(1), fixer: z.string().min(1) }).optional(),
  technique: techniqueIdSchema,
  difficulty: difficultySchema,
  // This step's input entry point (login box / search field / code box).
  surface: surfaceKindSchema,
  fields: z.array(inputFieldSchema),
  query: z.object({
    template: z.string(),
    description: z.string().optional(),
    inputFilter: inputFilterSchema.optional(),
  }),
  winCondition: winConditionSchema,
  hints: z.array(hintSchema),
  expectedSolution: z.object({
    inputs: z.record(z.string(), z.string()),
    note: z.string().optional(),
  }),
  debrief: debriefSchema,
})
export type Objective = z.infer<typeof objectiveSchema>

export const caseSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    number: z.string().min(1), // display number, e.g. "001"
    title: z.string(),
    briefing: z.object({ handler: z.string(), text: z.string() }),
    target: z.object({ appName: z.string() }),
    // ONE database shared by every objective in the case (Model A — persistent).
    database: z.object({
      schemaSql: z.string(),
      seedSql: z.string(),
      visibleSchema: z.array(visibleTableSchema),
    }),
    objectives: z.array(objectiveSchema).min(1),
    caseClosed: z.object({ headline: z.string(), fixer: z.string() }),
    tags: z.array(z.string()).optional(),
  })
  .superRefine((c, ctx) => {
    // Objective ids must be unique — progress + the DB snapshots key on them.
    const ids = c.objectives.map((o) => o.id)
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'objective ids must be unique within a case',
        path: ['objectives'],
      })
    }
  })
export type Case = z.infer<typeof caseSchema>

// Build/dev validation gate: throws (ZodError) on an invalid case, so a malformed
// case JSON fails the build instead of shipping.
export function parseCase(data: unknown): Case {
  return caseSchema.parse(data)
}

export function safeParseCase(data: unknown) {
  return caseSchema.safeParse(data)
}
