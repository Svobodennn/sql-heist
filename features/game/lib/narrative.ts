// In-world narrative copy (docs/06-narrative.md). Copy that the FROZEN level
// schema has no field for — loot-reveal headline/flavor, the debrief's in-world
// framing, and rank names — lives here, keyed by level id. This is wiring only:
// no engine, no attack/win data, no scoring math (that stays in lib/engine).

export type StarTier = 1 | 2 | 3

export interface LootReveal {
  headline: string // §4 — <=16 chars, ALL-CAPS ("YOU'RE IN.")
  fixer: string // §4 — the Fixer's loot line
  stars: Record<StarTier, string> // §4 — per-tier flavor (3*/2*/1*)
}

export interface DebriefFraming {
  // §5 — the in-world "in" line the Fixer says before the TECHNICAL body
  // (explanation/CodeCompare) that ships in the level JSON.
  transition: string
}

export interface JobNarrative {
  loot: LootReveal
  debrief: DebriefFraming
}

// §5 — one debrief intro for every job (the "a pro knows both sides" framing).
export const DEBRIEF_INTRO =
  "Every job you just pulled, somebody left a door open. Here's how it should've been locked. Learn it — next time you might be the one guarding it."

// §7 — "Call the Fixer" tray: 3 tiers, opened strictly in order.
export const HINT_TIER_LABELS = ['A word', 'The method', 'The play'] as const

// §7 — star-tier vocabulary (paired with the star icons so meaning never rides
// on color/icon alone — WCAG 1.4.1).
export const STAR_TIER_LABELS: Record<StarTier, string> = {
  3: 'Clean',
  2: 'Done',
  1: 'Loud',
}

export const JOB_NARRATIVE: Record<string, JobNarrative> = {
  'front-door': {
    loot: {
      headline: "YOU'RE IN.",
      fixer:
        "That's an admin's badge on your chest. Nobody stopped you — nobody will, until somebody bothers to lock that door right. Come see how they should've.",
      stars: {
        3: "Clean. In and out, no fingerprints. The Fixer won't say nice work — he'll just call again.",
        2: "Messy, but the badge is real. Tripped an alarm nobody was listening to. It'll do.",
        1: "Ugly. Loud. You're in, barely. A job's a job — but run it clean next time.",
      },
    },
    debrief: {
      transition:
        "You didn't pick that lock. There was no lock. They built the door to read whatever you slid under it as part of the key.",
    },
  },
  vault: {
    loot: {
      headline: "VAULT'S OPEN.",
      fixer:
        "There it is — an account that's got no business on a shopping page. That's the take. They stacked the money next to the milk and called it a database.",
      stars: {
        3: 'Two questions, one breath. The clerk never blinked. That is craft.',
        2: "Took a few tries to match the shape, but the ledger's in your pocket.",
        1: "You brute-forced your way to it. Loot's loot — but that was noise, not craft.",
      },
    },
    debrief: {
      transition:
        "The search and the vault shared a well, so one question could scoop from both. A real lock keeps the money's table off the menu — and keeps the question fixed no matter what you type.",
    },
  },
  blueprint: {
    loot: {
      headline: 'GOT THE PLANS.',
      fixer:
        "That's it. The whole thing. You didn't guess your way in — you made the building tell you where it hid its own secret. That's not a thief. That's a ghost.",
      stars: {
        3: "You read the building and it never knew. Cleanest work I've seen. Don't get comfortable.",
        2: 'Took the long way through the catalog, but the plans are ours.',
        1: "Rough, loud, and the plans are on the table anyway. We'll take it.",
      },
    },
    debrief: {
      transition:
        "You made the building hand you its own directory. Handy for you — a nightmare for them. The fix isn't hiding the catalog; it's making sure a search box can never ask for it.",
    },
  },
}

export function getJobNarrative(levelId: string): JobNarrative | undefined {
  return JOB_NARRATIVE[levelId]
}

// §9 — ranks are cosmetic (they unlock nothing) and key off cumulative Σ jobScore.
// Bands sit on the scoring engine's shape (base 1000/job, timeBonusCap 200,
// minScore 100): Ghost ≈ three near-perfect jobs, Made ≈ three clean jobs.
export interface Rank {
  name: string
  min: number // inclusive cumulative-score floor
}

export const RANKS: readonly Rank[] = [
  { name: 'Nobody', min: 0 },
  { name: 'Runner', min: 1 },
  { name: 'Earner', min: 1800 },
  { name: 'Made', min: 2700 },
  { name: 'Ghost', min: 3300 },
]

export function rankForScore(totalScore: number): Rank {
  let current = RANKS[0]
  for (const rank of RANKS) {
    if (totalScore >= rank.min) current = rank
  }
  return current
}
