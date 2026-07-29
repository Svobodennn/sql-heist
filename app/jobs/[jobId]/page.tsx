// Job player route (Server Component). Pre-renders the 3 MVP jobs at build time.
// Level JSON import + Zod validate + <JobPlayer> client tree land in P1/P3.

export function generateStaticParams() {
  return [{ jobId: 'front-door' }, { jobId: 'vault' }, { jobId: 'blueprint' }]
}

// Next.js 15: `params` is async (a Promise).
export default async function JobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  return (
    <main>
      <h1>Job: {jobId}</h1>
      <p>Placeholder — the recon view and exploit console will live here.</p>
    </main>
  )
}
