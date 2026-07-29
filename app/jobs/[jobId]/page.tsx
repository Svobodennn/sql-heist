import { notFound } from 'next/navigation'
import { getLevel, getNextJobId, JOB_IDS } from '@/features/game/levels'
import { JobPlayer } from '@/features/game/components/JobPlayer'

// Job player route (Server Component). Pre-renders the 3 MVP jobs at build time;
// each level JSON is validated through the frozen engine's parseLevel (in the
// levels registry) and passed to the client <JobPlayer>. The engine/WASM is
// dynamically imported inside JobPlayer, so this route prerenders without WASM.
export function generateStaticParams() {
  return JOB_IDS.map((jobId) => ({ jobId }))
}

export const dynamicParams = false

export default async function JobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const level = getLevel(jobId)
  if (!level) notFound()

  return <JobPlayer level={level} nextJobId={getNextJobId(jobId)} />
}
