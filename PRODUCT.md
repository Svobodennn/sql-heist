# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: **developers who know SQL but have never exploited or defended against SQL injection** — they can read a query, but they have never watched their own input break out of one. The product optimizes first for this SQL-literate developer meeting injection for the first time.

Secondary, confirmed audiences: people newer to security generally, and CTF / security-education enthusiasts.

Situation and job: at a browser, wanting to genuinely understand how SQL injection works and — more importantly — how to stop it, by *doing* the attack in a safe sandbox rather than reading about it.

## Product Purpose

SQL Heist is a browser-based, heist-themed game that teaches **SQL injection in order to teach defense**. The player is the crew's hacker; a handler called *Neo* hands out cases, and the player breaks into each target's database by typing real injection payloads into ordinary-looking web forms. Every objective ends with a **defense debrief** pairing the vulnerable query with its parameterized fix.

Guiding thesis: **"you can't defend what you don't understand."** See the attack, then see exactly how a developer shuts it down.

Success means a player plays through the cases, the injections *genuinely* work against a real engine, and they leave understanding both the attack and its parameterized defense.

Goal framing (confirmed with the owner): SQL Heist is treated as an **educational product** — something real developers and learners should discover, use, and stick with (with room to grow more cases and promote it later). Design decisions favor reach, clarity for newcomers, and retention over pure showcase or one-off polish.

## Positioning

The mechanism a neighboring tutorial or CTF could not truthfully copy wholesale: **a real SQLite engine runs entirely inside the browser** (`sql.js` — SQLite compiled to WebAssembly), and the game **renders the actual SQL being built live as the player types**, so they literally see their input break out of the query. Payloads genuinely execute; there is no faked or simulated target. This is paired with a **mandatory defense-first debrief** on every objective — the vulnerable query beside its parameterized rewrite, shown across ~10 backend stacks (per README).

Real engine + live SQL + defense pairing, in the spirit of OWASP Juice Shop, PortSwigger's Web Security Academy, and SQL Noir — but built around attack-then-defense on a live in-browser database.

## Operating Context

The core **objective loop** is a fixed product contract:

1. **Brief** — Neo sets the objective.
2. **Recon** — inspect the target's fake web app (a login box, a search field, a URL param) plus a **recon notebook** that fills in as the player discovers tables and columns.
3. **Exploit** — type a payload into the form; the **real SQL builds live** as you type.
4. **Loot** — extract the target data; the win condition fires. What you pull in one objective is exactly what the next objective needs.
5. **Debrief** — the vulnerable query vs. its safe, parameterized rewrite, and why the fix works.

Structure: **three cases, eight objectives total.** Each objective teaches one distinct technique, and each objective's loot feeds the next, so a case plays as one continuous heist rather than disconnected puzzles.

- **The Front Door** — auth bypass → schema discovery (`sqlite_master`) → `UNION` extraction
- **The Quiet Room** — blind boolean → blind timing → error-based
- **The Vault** — WAF / filter bypass → stacked queries

Deployed live as a static site (Vercel, `sql-heist.vercel.app`). Everything runs client-side: no backend, no accounts, no network, nothing leaves the player's machine.

## Capabilities and Constraints

- **100% client-side, static export** — deployable to any static host. No backend, no user accounts, no multiplayer (all by design).
- **Real SQLite via `sql.js`** (WebAssembly); each objective/case loads a fresh database.
- **Data-driven cases** — each case is a JSON file validated by a Zod schema at import (a malformed case fails the build). Adding or editing a case does not touch the engine: *new content = new JSON.*
- **Frozen engine + schema contracts** (`lib/engine`, `lib/schema`: composer, SQLite runner, win evaluator, case session), fully test-covered. The win-DSL is extended **additively** (optional fields) and never broken; new pure modules may be added beside the frozen ones.
- The intentionally **"vulnerable" query-building** inside the engine is deliberate — it is the pedagogical point, not a bug. This is a learning project and must not be presented as production practice; every debrief demonstrates the parameterized fix.
- **i18n** — English (master), Turkish, Polish, on per-locale static routes (`/` · `/tr` · `/pl`). Case *mechanics* live in the English base JSON; per-locale *narrative* overlays are merged in for tr/pl.
- **In-world terminology** — handler = *Neo* (a fixer); the mark = *Meridian Holdings* (a data-broker conglomerate); a case = a heist run; loot = the extracted target data / flag; objectives chain within a case.

## Brand Commitments

- **Name:** SQL Heist. Tagline: *"Learn SQL injection by pulling off the hack — then learn exactly how to shut it down."*
- **Voice:** film-noir + heist tension. In-world copy is authored in **English as the master** — the genre is born in English and the noir voice is deliberately not translated word-for-word; tr/pl are localized overlays of the same voice. Briefs **telegraph the category** of a technique through a consistent building metaphor **without naming or spoiling** the exact technique.
- **Defense-first is non-negotiable:** every attack is always paired with its parameterized fix.
- **Logo/favicon mark** ("cowled") is from [game-icons.net](https://game-icons.net), licensed CC BY 3.0 — attribution must be preserved.

## Evidence on Hand

- A shipped, playable, deployed product. Design sources: `README.md`, `docs/00-vision.md`, `docs/02-game-design.md`. (`docs/06-narrative.md` is an older narrative draft — superseded by shipped content where it conflicts; e.g. its "Blueprint" arc is not what shipped.)
- Real case content: `content/cases/{the-front-door,the-quiet-room,the-vault}.json` plus `content/cases/i18n/{tr,pl}.json` narrative overlays.
- Defense debriefs carry parameterized fixes across multiple backend stacks (recent work added Prisma, Drizzle, Sequelize examples; README states ~10 stacks).
- **No fabricated social proof exists and none must be invented.** There are no testimonials, user/download counts, benchmarks, ratings, pricing, or named customers. It is a free, open teaching project; future marketing or landing work must not manufacture proof.

## Product Principles

1. **Defense is the deliverable.** The attack is the hook; the parameterized fix is the payoff — never present the exploit without the defense.
2. **Real, not simulated.** The engine actually runs and the SQL is shown honestly as it builds; never fake the mechanism the player is meant to learn.
3. **Content is data; the engine is frozen.** New cases are JSON validated at build time; engine and schema contracts extend additively and never regress.
4. **Teach the SQL-literate newcomer first.** Optimize for the developer who knows SQL but is new to injection — clarity and progressive discovery over cleverness.
5. **Immersion carries the lesson.** The noir/heist voice and the continuous-heist chaining exist to keep a learner engaged across eight techniques; tone serves retention, not decoration.
