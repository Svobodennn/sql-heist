import { getSupabase } from '@/lib/supabase'
import type { CaseProgressMap } from './useCaseProgress'

const PROGRESS_COLUMNS = 'case_id, completed_objectives'
const UPSERT_PROGRESS_RPC = 'upsert_case_progress'

interface ServerProgressRow {
  case_id: string
  completed_objectives: string[]
}

function transportError(message: string): Error {
  return new Error(`Progress sync failed: ${message}`)
}

async function upsertCaseProgress(caseId: string, objectiveIds: string[]): Promise<void> {
  const supabase = getSupabase()
  if (!supabase || objectiveIds.length === 0) return

  const { error } = await supabase.rpc(UPSERT_PROGRESS_RPC, {
    p_case_id: caseId,
    p_completed_objectives: objectiveIds,
  })
  if (error) throw transportError(error.message)
}

export async function fetchServerProgress(): Promise<CaseProgressMap> {
  const supabase = getSupabase()
  if (!supabase) return {}

  const { data, error } = await supabase.from('case_progress').select(PROGRESS_COLUMNS)
  if (error) throw transportError(error.message)

  return Object.fromEntries(
    ((data ?? []) as ServerProgressRow[]).map((row) => [
      row.case_id,
      { objectives: [...new Set(row.completed_objectives)] },
    ]),
  )
}

export async function pushObjectiveWin(caseId: string, objectiveId: string): Promise<void> {
  await upsertCaseProgress(caseId, [objectiveId])
}

export function mergeCaseProgress(
  local: CaseProgressMap,
  server: CaseProgressMap,
): CaseProgressMap {
  const caseIds = new Set([...Object.keys(local), ...Object.keys(server)])

  return Object.fromEntries(
    [...caseIds].map((caseId) => [
      caseId,
      {
        objectives: [
          ...new Set([...(local[caseId]?.objectives ?? []), ...(server[caseId]?.objectives ?? [])]),
        ],
      },
    ]),
  )
}

export function subtractCaseProgress(
  current: CaseProgressMap,
  adopted: CaseProgressMap,
): CaseProgressMap {
  return Object.fromEntries(
    Object.entries(current).flatMap(([caseId, progress]) => {
      const adoptedObjectives = new Set(adopted[caseId]?.objectives ?? [])
      const remaining = [...new Set(progress.objectives)].filter(
        (objectiveId) => !adoptedObjectives.has(objectiveId),
      )
      return remaining.length > 0 ? [[caseId, { objectives: remaining }]] : []
    }),
  )
}

export async function mergeLocalIntoServer(local: CaseProgressMap): Promise<CaseProgressMap> {
  const server = await fetchServerProgress()
  const merged = mergeCaseProgress(local, server)

  await Promise.all(
    Object.entries(local).map(([caseId, progress]) =>
      upsertCaseProgress(caseId, progress.objectives),
    ),
  )

  return merged
}
