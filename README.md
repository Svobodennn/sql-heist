# SQL Heist

> Learn SQL injection by pulling off the hack — then learn exactly how to shut it down.

**SQL Heist** is a browser-based, heist-themed game that teaches **SQL injection** in order to teach **defense**. You play the crew's hacker: a handler called *Neo* hands you cases, and you break into each target's database by typing real injection payloads into ordinary-looking web forms. Every objective ends with a **defense debrief** that shows the vulnerable query next to its parameterized fix.

The guiding idea: **you can't defend what you don't understand.** See the attack, then see how a developer stops it.

## Is this safe and ethical?

Yes. SQL Heist is a **teaching tool**, in the spirit of OWASP Juice Shop, PortSwigger's Web Security Academy, and SQL Noir:

- **100% client-side, local sandbox.** A real (tiny) SQLite database runs *inside your browser* via [`sql.js`](https://sql.js.org) (SQLite compiled to WebAssembly). Your payloads genuinely work against it, but never reach a real target or a remote execution backend. Optional account sync is separate from the practice target.
- **Defense-first.** Every attack is paired with the exact parameterized query that neutralizes it.
- No live-system credentials or targets. Practice payloads stay in the browser; only players who choose an account send identity and completed-objective data to Supabase for sync.

## How it plays

The game is **three cases**; each case is a short run of **objectives** that chain into a single break-in. Every objective runs the same loop:

1. **Brief** — Neo explains the objective.
2. **Recon** — inspect the target's fake web app (a login box, a search field…) and the recon notebook that fills in as you discover tables and columns.
3. **Exploit** — type a payload into the form. The game renders the **real SQL being built, live**, as you type — so you can *see* your input break out of the query.
4. **Loot** — extract the target data; the win condition fires. What you pull in one objective is exactly what the next one needs.
5. **Debrief** — the vulnerable query vs. its safe, parameterized rewrite, and why the fix works.

### The three cases

Eight objectives across three cases; each objective teaches one distinct technique, and each objective's loot feeds the next — so a case plays as one continuous heist, not eight disconnected puzzles.

| Case | Objectives (technique) |
|------|------------------------|
| **The Front Door** | auth bypass → schema discovery (`sqlite_master`) → `UNION` extraction |
| **The Quiet Room** | blind boolean → blind timing → error-based |
| **The Vault** | WAF / filter bypass → stacked queries |

## Tech

- **Next.js** (App Router) + **TypeScript**
- **sql.js** — SQLite compiled to WebAssembly: the real database engine, running in the browser
- Client-only Supabase auth and progress sync — optional; anonymous local play remains the default
- **Static export** — deployable to any static host, with no Next.js server runtime
- **Data-driven cases**: each case is a JSON file; adding or editing a case does not touch the engine
- **i18n** — English, Turkish, Polish, on per-locale static routes (`/` · `/tr` · `/pl`)

## Status

✅ **Live** — deployed to Vercel at <https://sqlheist.com>.

- Core engine (query composer, SQLite runner, win evaluator, case session) — fully test-covered
- Three cases · eight objectives · defense debrief with the parameterized fix across 10 backend stacks
- Full game UI + narrative, recon notebook, per-technique badges
- Localized end-to-end (en / tr / pl)

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # unit + component + golden suite (Vitest)
npm run build      # static export -> out/
npm run test:e2e   # Playwright end-to-end
```

## Project layout

```
docs/             Design docs and the master plan (PLAN.md)
lib/schema/       Case + level JSON schema (Zod)
lib/engine/       Game engine: composer, SQLite runner, win evaluator, case session
content/cases/    Case data (JSON) + per-locale narrative overlays (i18n/)
features/game/    Game domain: components + pure game logic + case registry (cases.ts)
i18n/  ui/        Shared translation layer + UI primitives
app/              Next.js routes + app chrome (English at root, /tr and /pl prefixed)
tests/            All tests — mirrors src (unit · components · cases · e2e)
public/           Static assets (incl. the sql.js WebAssembly binary)
```

## A note on the code

This is a **learning project**. The intentionally "vulnerable" query building inside the engine is the whole point of the exercise. Real applications must always use parameterized queries / prepared statements — which is exactly what every objective's debrief demonstrates.

## Credits

- The logo/favicon is a modified form of [“Cowled” by Lorc](https://game-icons.net/1x1/lorc/cowled.html), used under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/); SQL Heist changes its geometry, colour, and size and adds database tiers to the lower cowl.
