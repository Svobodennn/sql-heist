import Link from 'next/link'

// Job board (Server Component, static). Real cards + lock/progress state land in P3.
const JOB_IDS = ['front-door', 'vault', 'blueprint'] as const

export default function JobBoardPage() {
  return (
    <main>
      <h1>Job Board</h1>
      <ul>
        {JOB_IDS.map((id) => (
          <li key={id}>
            <Link href={`/jobs/${id}`}>{id}</Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
