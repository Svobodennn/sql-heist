# SQL Heist

> Learn SQL injection by pulling off the hack — then learn exactly how to shut it down.

**SQL Heist** is a browser-based, heist-themed game that teaches **SQL injection** in order to teach **defense**. You play the crew's hacker: a handler called *The Fixer* hands you jobs, and you break into each target's database by typing real injection payloads into ordinary-looking web forms. Every job ends with a **defense debrief** that shows the vulnerable query next to its parameterized fix.

The guiding idea: **you can't defend what you don't understand.** See the attack, then see how a developer stops it.

## Is this safe and ethical?

Yes. SQL Heist is a **teaching tool**, in the spirit of OWASP Juice Shop, PortSwigger's Web Security Academy, and SQL Noir:

- **100% client-side, local sandbox.** A real (tiny) SQLite database runs *inside your browser* via [`sql.js`](https://sql.js.org) (SQLite compiled to WebAssembly). Your payloads genuinely work against it — but there is **no real target, no backend, and no network**.
- **Defense-first.** Every attack is paired with the exact parameterized query that neutralizes it.
- No credentials, no live systems, nothing leaves your machine.

## How it plays

Every job runs the same loop:

1. **Brief** — The Fixer explains the job.
2. **Recon** — inspect the target's fake web app (a login box, a search field…).
3. **Exploit** — type a payload into the form. The game renders the **real SQL being built, live**, as you type — so you can *see* your input break out of the query.
4. **Loot** — extract the target data; the win condition fires.
5. **Debrief** — the vulnerable query vs. its safe, parameterized rewrite, and why the fix works.

### The three jobs (MVP)

| # | Job | Technique you learn |
|---|-----|---------------------|
| 1 | **The Front Door** | Authentication bypass — comment out the password check (`' OR '1'='1' --`). |
| 2 | **The Vault** | `UNION`-based extraction — determine the column count, then pull data from another table. |
| 3 | **The Blueprint** | Schema discovery via `sqlite_master`, then `UNION` the contents of a hidden table. |

Later techniques (blind, error-based, stacked queries, WAF bypass) are on the roadmap.

## Tech

- **Next.js** (App Router) + **TypeScript**
- **sql.js** — SQLite compiled to WebAssembly: the real database engine, running in the browser
- 100% client-side, **static export** — deployable to any static host
- **Data-driven levels**: each level is a JSON file; adding a level does not touch the engine

## Status

🚧 **Work in progress.**

- ✅ Design and planning complete — see [`docs/`](./docs) (`PLAN.md` is the master plan)
- ✅ Core engine (query composer, SQLite runner, win evaluator, level session) — fully test-covered
- 🔜 Level content, game UI, narrative, deployment

## Development

```bash
npm install
npm run dev     # local dev server
npm test        # run the test suite (Vitest)
npm run build   # static export -> out/
```

## Project layout

```
docs/             Design docs and the master plan (PLAN.md)
lib/schema/       Level JSON schema (Zod)
lib/engine/       Game engine: composer, SQLite runner, win evaluator, level session
content/levels/   Level data (JSON) — coming soon
features/game/    Game UI components — coming soon
app/              Next.js routes
public/           Static assets (incl. the sql.js WebAssembly binary)
```

## A note on the code

This is a **learning project**. The intentionally "vulnerable" query building inside the engine is the whole point of the exercise. Real applications must always use parameterized queries / prepared statements — which is exactly what every job's debrief demonstrates.
