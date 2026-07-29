import Link from 'next/link'

// Landing / main menu (Server Component, static). Placeholder — noir theme lands in P3.
export default function HomePage() {
  return (
    <main>
      <h1>SQL Heist</h1>
      <p>A browser-based SQL injection training game. Three jobs. One crew.</p>
      <Link href="/jobs">Start the heist</Link>
    </main>
  )
}
