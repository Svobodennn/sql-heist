# Orchestration Directive — SQL Heist PLANNING Phase (docs-first)
Generated: 2026-07-29
Orchestrator: maestro (planning advisor — parent executes Agent() calls)

## Task
Docs-first, multi-agent PLANNING of "SQL Heist" (heist-themed educational SQL-injection
game; Next.js App Router + TypeScript + sql.js/SQLite-WASM, 100% client-side; data-driven
JSON levels; MVP = 3 jobs). Each domain agent writes ITS OWN markdown to an absolute path;
parent then synthesizes into a master PLAN.md and has plan-reviewer audit it.

## HARD RULE — PLANNING ONLY
NO agent writes code. Every deliverable is a design/planning document. If any agent
produces source files (.ts/.tsx/.css/etc.), the parent REJECTS that output and retries
with feedback. Real code belongs to a later (separate) implementation phase.

## Pattern
Collaborative Swarm (gated fan-out): backbone → lock → parallel fan-out → synthesize → review.
Rationale: two agents lay a shared contract (level-JSON schema + engine contract); the parent
LOCKS it; then four independent domain plans fan out against the locked contract. Because each
agent writes a DISTINCT file, the fan-out is file-conflict-free and truly parallel.

## Memory
No prior workflow memory matched (fresh project; `grep -ril` over memory returned nothing).

## File-conflict safety (parallel groups)
Distinct output files per agent → no write contention:
01-architecture (architect) · 02-game-design (planner) · 03-security-content (security-analyst)
· 04-frontend-ux (designer) · 05-data-model (data-modeler) · 06-narrative (copywriter).

## Division of responsibility (prevents overlap/gaps)
- Level JSON schema: **architect = CANONICAL shape (field names + types)**; planner fills
  game-design SEMANTICS; data-modeler writes the field-by-field type spec + seed/schema detail.
  No agent may define a COMPETING schema.
- Per-job attack/defense CONTENT correctness = security-analyst. Per-job DESIGN (objective,
  hint ladder, win-condition semantics, scoring) = planner. Target DB schema + seed + loot =
  data-modeler. Screens/visuals = designer. In-world copy/story = copywriter.

---

## phase_1_backbone  (Gate 1)
replan_checkpoint_after: true  (parent LOCKS the level-JSON contract + 3-job skeleton before Gate 2)

- subagent_type: architect
  parallel_group: 1
  purpose: Technical architecture + CANONICAL level-JSON schema + core engine/injection contract
  dependencies: []   # reads docs/00-vision.md
  model: inherit (omit param; agent is opus by config)
  accept_criteria:
    - File exists: /Users/svoboden/development/sql-heist/docs/01-architecture.md
    - Contains a CANONICAL level-JSON schema (field names + types + purpose)
    - Defines the input→query-template injection contract (the "vulnerable query build")
    - Defines a win-condition evaluation mechanism / DSL form
    - Makes the input-surface decision (form-field vs code-console vs both) WITH rationale
    - Per-job engine skeleton for all 3 jobs; >=3 risks with mitigation
    - Returns <=200-word summary naming the file path
  prompt: |
    SQL Heist — heist-temali, Next.js (App Router) + TypeScript + sql.js (SQLite WASM, %100
    client-side) ile SQL injection ogreten egitim oyunu. Sen PLANLAMA fazindasin: KOD YAZMA,
    sadece mimari TASARIM dokumani uret.

    ONCE OKU: /Users/svoboden/development/sql-heist/docs/00-vision.md (ozellikle §4 cekirdek
    dongu, §5 teknik direkler, §7 MVP 3 job, §12 acik sorular).

    GOREVIN: Teknik mimari planini SU DOSYAYA YAZ:
    /Users/svoboden/development/sql-heist/docs/01-architecture.md

    Kapsam:
    1. Next.js App Router yapisi: route/segment agaci, component sinirlari, client/server ayrimi
       (sql.js client-side).
    2. sql.js entegrasyonu: WASM yukleme, her level icin TAZE DB, sorgu calistirma akisi,
       guvenli sandbox garantisi.
    3. CEKIRDEK ENGINE KONTRATI (en kritik): oyuncu input'unun query template'e enjekte edilerek
       gercek SQL'i olusturmasi (oyunun kalbi — zafiyetli sorgu insasi). Bu mekanizmanin
       interface'ini net tanimla.
    4. KANONIK LEVEL JSON SEMASI: alan-alan (field adi + tip + aciklama) tam sema (query
       template, schema/seed ref, win-condition DSL, hints, vuln kod, secure kod vb.). BU SEMA
       KANONIKTIR — 02/03/04/05/06 buna dayanacak.
    5. Win-condition degerlendirme mekanizmasi + DSL bicimi (hedef satir / gizli flag).
    6. INPUT YUZEYI KARARI (vision §12): form-field taklidi mi, kod-editor konsolu mu, ikisi mi?
       Gerekcesiyle karar ver.
    7. State yonetimi, build/deploy (static export, Vercel).
    8. HER JOB icin engine-facing skeleton (Front Door / Vault / Blueprint: technique -> beklenen
       win-condition tipi + query template sekli).

    Ayrica 3-4 risk + mitigasyon. planner (02) ile ORTAK "level JSON semasi + engine kontrati"
    konusunda architect KANONIKTIR (planner semantigi doldurur) — bunu belirt. KOD YAZMA.

    BITIRINCE: <=200 kelime ozet don — input yuzeyi karari, JSON sema alan listesi, win-condition
    DSL bicimi, dosya yolu.

- subagent_type: planner
  parallel_group: 1
  purpose: Game design — 3-job design, core-loop mechanics, scoring formula, hint system
  dependencies: []   # reads docs/00-vision.md
  model: inherit (omit param)
  accept_criteria:
    - File exists: /Users/svoboden/development/sql-heist/docs/02-game-design.md
    - 3 jobs each: objective, technique, recon surface, example payload, win-condition semantics, 3-step hint ladder
    - Scoring formula defined (vision §12)
    - REFERENCES architect's schema fields (no competing schema)
    - Produces a per-job design skeleton table (technique + loot + win-condition semantics)
    - Returns <=200-word summary naming the file path
  prompt: |
    SQL Heist — heist-temali, Next.js + sql.js ile SQL injection ogreten egitim oyunu. PLANLAMA
    fazi: KOD YAZMA, sadece oyun tasarimi dokumani uret.

    ONCE OKU: /Users/svoboden/development/sql-heist/docs/00-vision.md (§4 cekirdek dongu,
    §6 mufredat, §7 MVP 3 job, §12 acik sorular — PUANLAMA senin kararin).

    GOREVIN: Oyun tasarimi planini SU DOSYAYA YAZ:
    /Users/svoboden/development/sql-heist/docs/02-game-design.md

    Kapsam:
    1. Cekirdek dongu mekanigi (Brief -> Recon -> Exploit -> Loot -> Debrief) oyun-tasarimi
       detayinda; her adimin oyuncu deneyimi.
    2. 3 MVP JOB TASARIMI (Front Door / The Vault / The Blueprint). Her job icin: ogrenme hedefi,
       hedef teknik, recon yuzeyi (login formu / arama / URL param), beklenen payload ornegi,
       win-condition SEMANTIGI (hangi loot = kazanc), ipucu merdiveni (3 kademe), zorluk artisi.
    3. PUANLAMA FORMULU (vision §12 — planner sahibi): deneme/sure/ipucu bazli formul.
    4. Ipucu sistemi tasarimi (ne zaman, nasil acilir).
    5. Job'lar arasi ilerleme/kilit acma (kapiyi ac -> kasayi bul -> plani cal yayi).
    6. Debrief pedagojisi: saldiri->savunma AKISI nasil sunulur (YAPI; guvenlik iceriginin
       DOGRULUGU security-analyst'in isi — sen akisi tasarla).
    7. Basari/basarisizlik geri bildirimi.

    KRITIK: Level JSON semasinin KANONIK tanimi architect'te (01). Sen o semanin GAME-DESIGN
    semantigini doldur (win-condition degerleri, ipucu icerik yapisi, puanlama alanlari) —
    RAKIP sema tanimlama, architect'in alan adlarina atifta bulun. 3 job icin "per-job design
    skeleton" tablosu uret (technique + loot + win-condition semantigi) — parent bunu kilitleyecek.
    KOD YAZMA.

    BITIRINCE: <=200 kelime ozet don — 3 job skeleton, puanlama formulu, ipucu modeli, dosya yolu.

---

## REPLAN CHECKPOINT (parent action — no agent)
Trigger: both Gate-1 agents accepted.
Parent does:
1. Reconcile architect's CANONICAL level-JSON schema + engine/win-condition DSL with planner's
   per-job design skeleton + scoring/hint semantics.
2. Emit a single LOCKED CONTRACT block containing:
   (a) FINAL level-JSON schema (field names + types),
   (b) per-job skeleton for all 3 jobs: technique, target loot concept, win-condition form,
       rough table/column shape (incl. UNION column count for Vault), recon surface,
       and the locked input-surface decision.
3. Conflict rule: architect is canonical for schema/engine/DSL; planner is canonical for
   scoring/hints/loot-semantics. If the two produced irreconcilable schemas or a win-condition
   mismatch that parent cannot merge → RE-INVOKE maestro for conflict resolution before Gate 2.
4. Parent INLINES the LOCKED CONTRACT verbatim into all four Gate-2 prompts (replace the
   <<LOCKED CONTRACT ...>> placeholder). This is what keeps the fan-out parallel-safe and
   convergent (agents never coordinate live).

---

## phase_2_fanout  (Gate 2)
All four depend on the LOCKED CONTRACT (01+02). Parent dispatches all four in ONE message
(four Agent blocks). Each reads 00+01+02 and the inlined LOCKED CONTRACT; each writes its own file.

- subagent_type: security-analyst
  parallel_group: 2
  purpose: Security CONTENT correctness — attack payloads + parameterized secure fixes (techniques 1-5)
  dependencies: [architect, planner]   # via LOCKED CONTRACT + 01/02
  model: inherit (omit param)
  accept_criteria:
    - File exists: /Users/svoboden/development/sql-heist/docs/03-security-content.md
    - Each of 3 jobs: working SQLite payload + vulnerable pattern + correct PARAMETERIZED secure fix + why-worked/why-fixed
    - Payloads are SQLite-syntax-correct; no broken/non-working payload
    - Returns <=200-word summary naming the file path
  prompt: |
    SQL Heist — SQL injection OGRETEN egitim oyunu (Next.js + sql.js/SQLite WASM, client-side,
    LOCAL sandbox — gercek hedef YOK). PLANLAMA fazi: KOD YAZMA, guvenlik ICERIGI dogrulugu
    dokumani uret.

    OKU: /Users/svoboden/development/sql-heist/docs/00-vision.md, /docs/01-architecture.md,
    /docs/02-game-design.md.

    KILITLENMIS KONTRAT (buna dayan):
    <<LOCKED CONTRACT — parent inlines: level JSON semasi + 3-job skeleton>>

    GOREVIN: Guvenlik icerigi planini SU DOSYAYA YAZ:
    /Users/svoboden/development/sql-heist/docs/03-security-content.md

    Kapsam (MVP teknikleri 1-5): tautology+comment (Front Door), kolon sayisi bulma + UNION
    extraction (Vault), sqlite_master sema kesfi (Blueprint). HER JOB ICIN:
    1. Saldiri: teknik dogru aciklama + CALISAN payload ornegi (SQLite'a karsi gercekten
       calismali — sozdizimini dogrula).
    2. Zafiyetli kod deseni: sorgunun neden enjekte edilebilir oldugu (string concat).
    3. Savunma: DOGRU parametreli/prepared sorgu versiyonu (secure kod) + neden acigi kapatir.
    4. "Neden calisti -> neden fix kapatir" pedagojik + teknik dogru eslesme (zorunlu debrief).
    Ayrica: payload'larin SQLite-ozgu dogrulugu, etik/guvenli-sandbox cercevesi, security ONAY
    kriteri (vision §10). Yanlis/calismayan payload = KRITIK hata.

    Structured finding formatina GEREK YOK — bu icerik uretimi/dogrulama. KOD YAZMA (secure fix
    ornegi kisa illustrasyon olabilir ama dosya/uygulama kodu YAZMA).

    BITIRINCE: <=200 kelime ozet don — 3 job payload+secure-fix dogrulugu, riskli noktalar, dosya yolu.

- subagent_type: data-modeler
  parallel_group: 2
  purpose: Data model — level-JSON type spec + per-job target DB schema, ER diagrams, seed data + loot
  dependencies: [architect, planner]   # via LOCKED CONTRACT + 01/02
  model: inherit (omit param)
  isolation_note: This agent runs isolation:worktree. Parent MUST verify the file exists at the
    absolute path in the MAIN working dir after completion; if the agent returns a
    "## WORKTREE HANDOFF" block, recover per ~/.claude/rules/worktree-handoff.md. (sql-heist is
    not a git repo, so a direct write is expected — but verify.)
  accept_criteria:
    - File exists (in main dir): /Users/svoboden/development/sql-heist/docs/05-data-model.md
    - Field-by-field level-JSON TYPE spec, CONSISTENT with architect's canonical schema (no competing schema)
    - Per-job target DB schema (tables/cols/types/keys) + Mermaid ER diagram
    - Seed data incl. the "loot"; Vault seed column-count MATCHES the UNION payload in 03
    - Win-condition JSON representation aligned with architect's DSL
    - Returns <=200-word summary naming the file path
  prompt: |
    SQL Heist — SQL injection ogreten egitim oyunu; her level TAZE bir SQLite (sql.js/WASM) DB'ye
    karsi calisir. PLANLAMA fazi: KOD YAZMA, veri modeli TASARIM dokumani uret.

    OKU: /Users/svoboden/development/sql-heist/docs/00-vision.md, /docs/01-architecture.md
    (KANONIK level JSON semasi burada), /docs/02-game-design.md.

    KILITLENMIS KONTRAT (buna dayan):
    <<LOCKED CONTRACT — parent inlines: level JSON semasi + 3-job skeleton>>

    GOREVIN: Veri modeli planini SU DOSYAYA YAZ:
    /Users/svoboden/development/sql-heist/docs/05-data-model.md

    Kapsam:
    1. LEVEL JSON SEMASININ tam alan-alan spesifikasyonu (architect'in KANONIK semasina sadik;
       TypeScript-benzeri tip tanimi olarak yaz — RAKIP sema uretme, architect'inkini detaylandir).
    2. HER JOB icin hedef DB semasi (tablolar, kolonlar, tipler, PK/FK/UK) + Mermaid ER diagram:
       - Front Door: users tablosu (auth bypass).
       - Vault: UNION icin kolon sayisi UYUMLU ana tablo + yan tablo (cekilecek gizli veri).
       - Blueprint: sqlite_master kesfi -> gizli loot tablosu.
    3. HER JOB icin SEED DATA: gercek satirlar + "loot" (gizli flag/kanit satiri). Payload'lar
       calissin diye seed UYUMLU olmali ( or. Vault UNION kolon sayisi eslesmeli).
    4. Win-condition'in JSON'daki temsili (architect DSL'ine uygun).
    5. Taze-DB-per-level yukleme yaklasimi (schema+seed JSON'a nasil gomulur).
    SQLite-ozgu notlar (sqlite_master davranisi Blueprint icin). KOD YAZMA (SQL DDL/seed
    ILLUSTRASYON olarak plan icinde olabilir; uygulama kodu/dosyasi YAZMA).

    BITIRINCE: <=200 kelime ozet don — 3 job sema+seed ozeti, JSON sema tipi, dosya yolu.

- subagent_type: designer
  parallel_group: 2
  purpose: Frontend/UX — noir theme, 5 core screens, transparent-SQL display, debrief layout
  dependencies: [architect, planner]   # via LOCKED CONTRACT + 01/02
  model: inherit (omit param)
  accept_criteria:
    - File exists: /Users/svoboden/development/sql-heist/docs/04-frontend-ux.md
    - Noir/heist theme direction (palette, type, mood)
    - 5 core screens described (Brief / Recon / Exploit / Loot / Debrief)
    - Transparent-SQL live display approach; input-surface UX aligned with architect's decision
    - Component inventory + wireframe-level layout; NO real React/CSS code
    - Returns <=200-word summary naming the file path
  prompt: |
    SQL Heist — heist/noir temali SQL injection egitim oyunu (Next.js). PLANLAMA fazi: KOD YAZMA,
    frontend/UX TASARIM dokumani uret (wireframe-seviye TARIF, gercek kod DEGIL).

    OKU: /Users/svoboden/development/sql-heist/docs/00-vision.md, /docs/01-architecture.md
    (ozellikle input yuzeyi karari + component sinirlari), /docs/02-game-design.md (dongu ekranlari).

    KILITLENMIS KONTRAT (buna dayan):
    <<LOCKED CONTRACT — parent inlines: level JSON semasi + 3-job skeleton>>

    GOREVIN: Frontend/UX planini SU DOSYAYA YAZ:
    /Users/svoboden/development/sql-heist/docs/04-frontend-ux.md

    Kapsam:
    1. Gorsel tema: noir + heist gerilimi — renk paleti, tipografi, mood, atmosfer yonu.
    2. EKRAN TASARIMLARI (cekirdek dongu): Brief, Recon (sahte hedef web app gorunumu), Exploit
       (input yuzeyi + olusan SQL'in SEFFAF gosterimi), Loot (kazanc), Debrief (saldiri<->savunma
       yan-yana: vuln kod vs secure kod).
    3. "Seffaf SQL" gosterimi: oyuncunun input'undan olusan gercek SQL nasil CANLI gosterilir
       (oyunun ogretici kalbi).
    4. Input yuzeyi UX'i (architect kararina uygun — form-field/konsol).
    5. Component envanteri + wireframe-seviye layout tarifi (metinle / ASCII / liste).
    6. Erisilebilirlik, responsive, basari/hata animasyon/feedback notlari.
    7. Debrief layout detayi (kod karsilastirma gorunumu).

    Gercek React/CSS KODU YAZMA — tasarim kararlari + wireframe tarifi.

    BITIRINCE: <=200 kelime ozet don — tema yonu, 5 ana ekran, seffaf-SQL gosterim yaklasimi, dosya yolu.

- subagent_type: copywriter
  parallel_group: 2
  purpose: Narrative & copy — heist arc, handler voice, per-job briefs, debrief framing, microcopy
  dependencies: [architect, planner]   # via LOCKED CONTRACT + 01/02
  model: inherit (omit param)
  accept_criteria:
    - File exists: /Users/svoboden/development/sql-heist/docs/06-narrative.md
    - Heist arc (open the door -> find the vault -> steal the blueprint); handler/fixer voice guide
    - 3 in-world job briefs + loot-reveal copy; debrief framing copy; tone do/don't; microcopy
    - Concrete embeddable copy (not placeholders)
    - Returns <=200-word summary naming the file path
  prompt: |
    SQL Heist — heist crew temali SQL injection egitim oyunu. PLANLAMA fazi: KOD YAZMA,
    anlati/metin (narrative & copy) dokumani uret.

    OKU: /Users/svoboden/development/sql-heist/docs/00-vision.md (§3 tema, §7 3 job yayi:
    kapiyi ac -> kasayi bul -> plani cal), /docs/01-architecture.md, /docs/02-game-design.md
    (job tasarimlari + debrief akisi).

    KILITLENMIS KONTRAT (buna dayan):
    <<LOCKED CONTRACT — parent inlines: level JSON semasi + 3-job skeleton>>

    GOREVIN: Anlati planini SU DOSYAYA YAZ:
    /Users/svoboden/development/sql-heist/docs/06-narrative.md

    Kapsam:
    1. Soygun yayi hikayesi: 3 job'u baglayan anlati (kapiyi ac -> kasayi bul -> plani cal).
    2. Karakter sesi: handler/fixer (isi veren) — noir ton, ses rehberi.
    3. HER JOB icin in-world BRIEF metni (handler'in is brifingi) + loot reveal/basari copy'si.
    4. Debrief cerceveleme copy'si: guvenlik dersini in-world hissettiren gecis metni (teknik
       DOGRULUK security-analyst'te; sen cerceveyi yaz).
    5. Ton rehberi (noir + heist gerilimi): do/don't.
    6. Microcopy: ipucu ifadeleri, hata/basarisizlik mesajlari, in-theme UI etiketleri.
    7. Onboarding/intro anlatisi.

    Metinler oyuna gomulebilecek duzeyde SOMUT olsun (placeholder degil). KOD YAZMA.

    BITIRINCE: <=200 kelime ozet don — yay ozeti, handler sesi, 3 brief ornegi, dosya yolu.

---

## phase_3_synthesis_and_review  (Gate 3)

### 3a. Parent synthesis (parent action — no agent)
Parent combines 00 + 01–06 into the master plan at:
  /Users/svoboden/development/sql-heist/docs/PLAN.md
Required sections (this set is what makes plan-reviewer able to APPROVE):
  1. Executive summary / vision recap
  2. LOCKED level-JSON schema (canonical) + core engine/injection contract + win-condition DSL
  3. The 3 jobs, each fully specced by folding in per-job: design (02) + security content (03)
     + data model/seed/loot (05) + screens (04) + brief/narrative (06)
  4. Mandatory defense debrief content per job (attack <-> parameterized fix)
  5. UX/screens summary + narrative arc
  6. PHASED IMPLEMENTATION PLAN (MVP build phases)
  7. **IMPLEMENTATION AGENT ROSTER** — per build phase, executing + QA agents, names verified in
     ~/.claude/agents/ (e.g. engine: kraken + code-reviewer/verifier; UI: frontend-dev + designer/
     code-reviewer; levels/data: backend-dev/data-modeler + code-reviewer; security content sign-off:
     security-reviewer). MUST match agent-assignment-matrix or carry a deviation rationale.
     (plan-reviewer BLOCKS a feature plan that lacks a per-phase agent roster.)
  8. Risks + mitigations, test strategy, dependencies.

### 3b. plan-reviewer audit
- subagent_type: plan-reviewer
  parallel_group: 3
  purpose: Gate-3 audit of the synthesized master plan (feature-plan mode); verdict gate
  dependencies: [parent synthesis of 01-06 into docs/PLAN.md]
  model: inherit (omit param; agent is sonnet by config)
  accept_criteria:
    - Emits a verdict: APPROVED / NEEDS WORK / REJECTED
    - Critical issues (blockers) listed separately from suggestions
    - Confirms per-phase implementation agent roster exists with VALID agent names
    - Returns <=200-word summary (verdict, blocker count, top 3 actions)
  prompt: |
    SQL Heist egitim oyununun MASTER planini denetle. Bu bir FEATURE PLAN'dir (yeni oyun tasarimi
    + implementasyon plani).

    OKU: /Users/svoboden/development/sql-heist/docs/PLAN.md (master). Gerekirse kaynak alt planlar:
    docs/00-vision.md, 01-architecture.md, 02-game-design.md, 03-security-content.md,
    04-frontend-ux.md, 05-data-model.md, 06-narrative.md.

    Feature-plan checklist'ini uygula. Ozellikle DENETLE:
    1. Level JSON semasi + engine kontrati NET ve tutarli mi (01/05 celismiyor mu)?
    2. 3 job (Front Door/Vault/Blueprint) TAM mi: her biri icin attack payload + secure fix +
       hedef sema + seed + win-condition + brief + ekran?
    3. Guvenlik icerigi dogru mu (payload'lar SQLite'a karsi calisir gorunuyor mu, secure fix
       parametreli mi)?
    4. Implementation AGENT ROSTER var mi: her faz icin executing + QA agent, isimler
       ~/.claude/agents/ icinde (ls ile DOGRULA), agent-assignment-matrix uyumlu?
    5. Data-driven iddiasi tutarli mi (yeni level = yeni JSON, engine degismeden)?
    6. Riskler + mitigasyon, test stratejisi, bagimliliklar mevcut mu?
    7. Alt planlar arasi bosluk/celiski (or. UNION kolon sayisi: security payload <-> data-modeler
       seed uyumu).

    VERDICT ver: APPROVED / NEEDS WORK / REJECTED. Kritik sorunlari (onayi BLOKLAR) + onerileri
    AYRI listele. KOD YAZMA.

    BITIRINCE: <=200 kelime ozet don — verdict, kritik bulgu sayisi, en onemli 3 aksiyon.

### 3c. Review-fail loop  (replan_checkpoint)
If plan-reviewer verdict is NEEDS WORK / REJECTED:
  - Parent maps each blocker to the OWNING agent (schema/engine -> architect; design/scoring ->
    planner; payloads/fixes -> security-analyst; schema/seed -> data-modeler; screens -> designer;
    copy -> copywriter), re-dispatches that agent with the specific feedback (max 3 retries each),
    re-synthesizes PLAN.md, re-runs plan-reviewer.
  - If still failing after retries, or if blockers are cross-cutting/contradictory -> RE-INVOKE
    maestro for conflict resolution / replanning.

---

## Parent execution contract (reminders)
1. Iterate gates in order; do not start a gate until the prior gate's accept_criteria are met.
2. Dispatch same-parallel_group agents in ONE message (multiple Agent blocks) for true parallelism.
3. OMIT the model param on every spawn (inherit; each agent carries its own configured model).
4. At the replan checkpoint, build the LOCKED CONTRACT and inline it (plus 01/02 summaries) into
   all four Gate-2 prompts, replacing the <<LOCKED CONTRACT ...>> placeholder.
5. After EACH agent, VERIFY the named output file exists at its absolute path before advancing
   (agent-output verification discipline). data-modeler: also handle worktree recovery if needed.
6. Enforce the HARD RULE: if any agent writes source code files, reject + retry with feedback.
7. On plan-reviewer non-APPROVED verdict, run the 3c review-fail loop.

## replan_checkpoints (where parent returns to maestro)
- After Gate 1: if architect vs planner schema/DSL are irreconcilable.
- After Gate 3 review: if blockers persist past retries or are cross-cutting/contradictory.
