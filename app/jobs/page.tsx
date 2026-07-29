import { getJobMetas } from '@/features/game/levels'
import { JobBoard } from '@/features/game/components/JobBoard'

// Job board (Server Component, static). Loads validated level metadata and hands
// it to the client <JobBoard>, which derives completed/active/locked from
// localStorage progress.
export default function JobBoardPage() {
  return (
    <div className="container">
      <JobBoard jobs={getJobMetas()} />
    </div>
  )
}
