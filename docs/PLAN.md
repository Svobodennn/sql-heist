# SQL Heist — Master Plan (PLAN.md)

> Gate 3 sentezi. 00-vision + 01–06 alt planlarının parent (Hızır) tarafından
> uzlaştırılmış birleşimi. Çapraz-çelişkiler §9'da kesin karara bağlandı.
> Statü: **plan-reviewer denetimine hazır.**

Kaynak dokümanlar: `00-vision` · `01-architecture` · `02-game-design` ·
`03-security-content` · `04-frontend-ux` · `05-data-model` · `06-narrative` ·
`locked-contract` · `orchestration-directive`.

---

## 1. Executive summary
SQL Heist — heist-temalı, tarayıcıda çalışan bir **SQL injection eğitim oyunu**.
Oyuncu "The Fixer" adlı handler'dan iş alan bir ekibin hacker'ı olarak, gerçek bir
SQLite (sql.js/WASM) veritabanına karşı injection teknikleriyle üç işi çözer; her iş
sonunda **saldırı → parametreli savunma** debrief'iyle biter. Tez: *saldırıyı öğren ki
savunabilesin.* Stack: **Next.js (App Router) + TypeScript + sql.js**, %100 client-side,
statik host. **Data-driven**: her level bir JSON; yeni level = yeni JSON (engine değişmez).
MVP = 3 job (Front Door → The Vault → The Blueprint).

## 2. Çekirdek kontrat (KANONİK)

### 2.1 Level-JSON şeması
Architect'in kanonik `Level` tipi (detay: 01 §5, alan-alan tip: 05 §1). Alanlar
[E]=engine tüketir / [C]=içerik-semantik:
```
schemaVersion[E] id[E] order[C] job[C] title[C] technique[C] difficulty[C]
brief{ handler, text, objective }[C]
debrief{ explanation, vulnerableCode, secureCode, takeaway }[C]
target{ appName, surface, fields[] }[E:surface]
database{ schemaSql, seedSql, visibleSchema[] }[E]
query{ template, description }[E:template]
winCondition[E]  hints[][C]  expectedSolution{ inputs }[E]  scoring?[C]  tags?[C]
```
Rakip şema yok; 03/04/05/06 bu şemayı doldurur.

### 2.2 Enjeksiyon kontratı (oyunun kalbi)
`query.template` içindeki `{{input:field}}`, oyuncunun **HAM** input'uyla değiştirilir —
**escape/parametrizasyon YOK** (vulnerable-by-design). Güvenli sürüm yalnızca debrief'te
illüstrasyon olarak gösterilir. Segment ayrımı (static vs injected) composer'dan gelir,
regex tahmini değil (04 §"THE WIRE").

### 2.3 Win-condition DSL (kanonik — §9'da mode netleşti)
`type` üzerinden tagged union, saf `WinEvaluator.evaluate(cond, ctx) → {won, reason}`:
- `rows-returned { min, max? }` — dönen satır sayısı aralıkta.
- `flag-in-result { flag, column? }` — belirli değer sonuçta görünür (`column` ops. = tüm
  kolonlar). *(planner "value-contains" = bu.)*
- `row-match { expect: Array<Record<string,SqlCell>>, mode:"subset"|"exact" }` — dönen
  satırlardan **en az biri**, `expect` dizisindeki bir girdinin tüm `col=val` çiftlerini
  karşılar. `subset` = satır fazladan kolon içerebilir; `exact` = birebir eşleşme.
  *(K6 çözümü: 01 §5.2 + 05 §1.3 KANONİK biçim benimsendi — dizi + subset/exact; 05'te çalışan
  JSON örneği var. İlk sentezdeki "obje + any" taslağı geçersiz.)*

Exec'ten ayrık; anti-trivial guard test-harness'ta.

### 2.4 Input yüzeyi (DONMUŞ)
Mimik form-field(ler) + her zaman görünür canlı **"oluşan SQL" preview**. MVP'de serbest
SQL konsolu YOK (v1). `target.surface` → login / search / url-param mimik'i sürer.

## 3. Üç job — tam spesifikasyon

Her payload **gerçek SQLite'a karşı doğrulandı** (03); tablo/loot adları 05'ten; win-condition
2.3'ten. Aşağıdaki template'ler **kanonik** (K1 uygulanmış — Front Door `is_admin` projekte eder).

### Job 1 · The Front Door — Auth bypass (T1–2)
- **Recon yüzeyi:** login formu (`surface: login`, fields: username, password).
- **Zafiyetli template:**
  `SELECT id, username, is_admin FROM users WHERE username = '{{input:username}}' AND password = '{{input:password}}'`
- **DB:** `users(id PK, username UK, password, is_admin)`; admin satırı `is_admin=1`.
- **Kazanan payload:** username = `admin' -- ` veya `' OR '1'='1' -- ` (password serbest).
- **Win:** `row-match { expect:[{is_admin:1}], mode:"subset" }`.
- **Loot:** admin oturumu.

### Job 2 · The Vault — Column-count + UNION extraction (T3–4)
- **Recon yüzeyi:** arama kutusu (`surface: search`, field: q). **UNION = 3 kolon.**
- **Zafiyetli template:**
  `SELECT id, name, price FROM products WHERE name LIKE '%{{input:q}}%'`
- **DB:** görünür `products(id,name,price)` + BİLİNEN `offshore_accounts(id, holder_name, account_ref, balance_usd)`.
- **Kolon keşfi:** `' ORDER BY 3 -- ` OK, `' ORDER BY 4 -- ` hata.
- **Kazanan payload:** `' UNION SELECT holder_name, account_ref, balance_usd FROM offshore_accounts -- `
- **Loot:** `account_ref = LOOT-VAULT-9F2C4471`. **Win:** `flag-in-result { flag:"LOOT-VAULT-9F2C4471" }`.

### Job 3 · The Blueprint — Schema discovery + UNION (T5)
- **Recon yüzeyi:** arama/param (`surface: search`). **UNION = 2 kolon.**
- **Zafiyetli template:**
  `SELECT title, body FROM articles WHERE title LIKE '%{{input:q}}%'`
- **DB:** görünür `articles(title, body)` + GİZLİ `z_bp_registry_7f3a(schematic_id, payload)`
  (`visibleSchema`'da YOK → keşfedilmeli).
- **Keşif payload:** `' UNION SELECT name, sql FROM sqlite_master -- ` → gizli tabloyu + DDL'i açığa çıkarır.
- **Kazanan payload:** `' UNION SELECT schematic_id, payload FROM z_bp_registry_7f3a -- `
- **Loot:** `payload = LOOT-BLUEPRINT-3D1F8A22`. **Win:** `flag-in-result { flag:"LOOT-BLUEPRINT-3D1F8A22" }`.

## 4. Zorunlu savunma debrief'i (her job)
Debrief `debrief{ explanation, vulnerableCode, secureCode, takeaway }` alanından render edilir
(içerik: 03; çerçeve copy: 06 "a pro knows both sides of every door"):
- **explanation:** payload neden çalıştı (string concat / ham `{{input}}`).
- **vulnerableCode:** enjekte edilebilir sorgu inşası (illüstrasyon).
- **secureCode:** parametreli/prepared sürüm — 03'te aynı payload'ları `[]`'e indirdiği doğrulandı.
- **takeaway:** tek cümlelik ders.
Not (K8): `#` yorumu SQLite'ta çalışmaz — sadece `--` ve `/* */` öğretilir.

## 5. UX + anlatı özeti
- **Tema (04):** noir dark-first (`#0B0D10`) + **Semantik Renk Yasası** (crimson=attack,
  jade=defense, brass=agency, steel=info; renk asla tek başına bilgi taşımaz — renk körlüğü).
  Mono font ligature KAPALI (`--` gizlenmesin).
- **5 ekran + hub:** Job Board → Brief (dossier) → Recon (sahte hedef app) → **Exploit**
  (split: "THE FRONT" mimik app ↔ "THE WIRE" canlı SQL + sonuç ızgarası) → Loot → Debrief
  (`<CodeCompare>` vuln↔secure yan yana).
- **Şeffaf-SQL:** `<SqlPreview>` her keystroke'ta katmanlı — injected input crimson band +
  break-out işareti, comment kuyruğu dim+strike. `dangerouslySetInnerHTML` YASAK (K7/XSS).
- **Anlatı (06):** Mark = **Meridian** (veri-simsarı). Yay: kapıyı aç → kasayı bul → planı çal.
  Handler = **The Fixer** (kısa, sokak dili, serin). Brief'ler tekniğin ADINI vermez; bina
  metaforuyla telegraf eder. Oyun-içi dil İngilizce.

## 6. Fazlı implementasyon planı (MVP)
| Faz | İçerik | Çıktı |
|---|---|---|
| **P0 · Scaffold** | Next.js App Router + TS + lint/format + test runner; sql.js + `sql-wasm.wasm` asset servis | çalışan boş iskelet |
| **P1 · Engine** | `Level` tipleri, injection composer (`{{input}}` ham), sql.js loader (taze-DB-per-level), `WinEvaluator` (3 DSL tipi + anti-trivial), scoring/hint motoru | test-kaplı çekirdek |
| **P2 · Level data** | 3 job JSON (schema/seed/template/winCondition/hints/debrief) — 03+05'ten; her level için payload CI testi | 3 oynanabilir level datası |
| **P3 · UI** | 5 ekran + Job Board, `<SqlPreview>`, `<CodeCompare>`, mimik form-field'ler, noir tema | oynanabilir UI |
| **P4 · Narrative + skor/ipucu** | 06 copy'nin gömülmesi, scoring gösterimi, 3-kademe ipucu | tam döngü |
| **P5 · Verify + deploy** | E2E (her job çözülür), a11y, perf, static export → Vercel | yayına hazır MVP |

Bağımlılık sırası: P0 → P1 → {P2 ∥ P3} → P4 → P5. P2 ve P3, P1'in engine kontratına dayanır.

## 7. Implementasyon agent roster'ı (faz bazlı)
Tümü `~/.claude/agents/` içinde doğrulandı; assignment-matrix uyumlu.

| Faz | Executing | QA / Sign-off |
|---|---|---|
| P0 Scaffold | `template-engine` + `frontend-dev` | `verifier` |
| P1 Engine | `kraken` (TDD) | `code-reviewer` + `security-reviewer` (injection/XSS surface) + `verifier` |
| P2 Level data | `backend-dev` (+ `data-modeler` danışman) | `code-reviewer` + `security-reviewer` (payload↔fix sign-off) + `arbiter` (payload CI) |
| P3 UI | `frontend-dev` (+ `designer` tasarım QA) | `code-reviewer` + `a11y-expert` (renk yasası/klavye) |
| P4 Narrative+skor | `frontend-dev` (+ `copywriter` metin) | `code-reviewer` |
| P5 Verify+deploy | `e2e-runner` + `shipper` | `verifier` (final gate) + `web-perf-expert` |

Roster sapma gerekçesi: P0'da `template-engine`+`frontend-dev` (matrix'in scaffold sahibi;
`devops` deploy için P5'te), P2 QA'ye `code-reviewer` eklendi (qa-loop baseline).
Her task Dev-QA loop'una tabi (implement → review → retry max 3 → escalate).

## 8. Test stratejisi
- **WinEvaluator:** saf unit — her DSL tipi + anti-trivial (boş/gürültü input WIN vermez).
- **Payload golden testleri (KRİTİK):** her level'ın `expectedSolution`'ı seed'li DB'ye karşı →
  WIN; benign input → not-win. Bu, içerik doğruluğunu CI'da kilitler (03 zaten manuel doğruladı).
- **Kolon-sayısı invariant'ı:** Vault seed 3 kolon, Blueprint 2 kolon — testle sabitlenir.
- **Secure-fix testi:** parametreli sürüm aynı payload'da `[]` döner.
- **E2E:** her job baştan sona oynanır (Recon → doğru payload → Loot → Debrief).
- **XSS:** echo'lar text-escape; `dangerouslySetInnerHTML` yok (lint kuralı).

## 9. Reconciliation kararları (parent — çapraz-çelişki çözümü)
| # | Çelişki | Karar |
|---|---|---|
| R1 (K1) | Front Door template `is_admin` projekte etmiyordu (01 §8.1) | Template `is_admin` SELECT eder (§3 kanonik); win `row-match` bunu okur. |
| R2 (K6) | `row-match` biçim: sentez taslağı "obje + any" ↔ 01/05 "dizi + subset/exact" | **01/05 KANONİK biçim benimsendi**: `expect: Array<Record<string,SqlCell>>, mode:"subset"\|"exact"` (05'te çalışan JSON var). §2.3 + locked-contract düzeltildi. |
| R3 | security payload'ları placeholder tablo adı (`vault`,`account`) | data-modeler'ın GERÇEK adlarıyla hizalandı: `offshore_accounts.account_ref`, `z_bp_registry_7f3a.payload`, `articles`. §3 kanonik. |
| R4 | UNION kolon sayısı (architect Vault=2) | **Vault=3, Blueprint=2** (locked-contract) — bilerek farklı; seed + payload bu değerlere sabit. |
| R5 (K8) | `#` yorumu | Öğretilmez; sadece `--` / `/* */`. |
| R6 (K7) | XSS | Engine/UI ham input'u DOM'a text olarak basar; `dangerouslySetInnerHTML` yasak. |
| R7 | 01'in illüstratif Front Door template'i `role` kolonu içeriyordu; 05'in kanonik `users` tablosunda `role` YOK | `role` düşürüldü; §3 template'i `role` projekte etmez (03 de senkronlandı). |

## 10. Riskler + mitigasyon
| Risk | Mitigasyon |
|---|---|
| sql.js WASM statik export'ta yüklenmezse | `sql-wasm.wasm`'ı `public/`'ten servis et; `locateFile` ile path sabitle; P0'da doğrula. |
| Payload↔seed drift (içerik bozulur) | Payload golden testleri (§8) her level'ı CI'da doğrular; tek-kaynak loot matrisi (05). |
| Oyuncunun injection yerine düz SQL yazması | Anti-trivial guard (WinEvaluator); mimik form-field zaten enjeksiyon-input dersini zorlar. |
| Şeffaf-SQL segment ayrımının yanlış render'ı | Segmentler composer'dan gelir (motor-doğru), regex değil (04). |
| WASM bundle boyutu / ilk yük | Lazy-load engine; iskelet ekranı önce; P5 perf. |
| İçerik güvenlik hatası (yanlış "güvenli" örnek) | `security-reviewer` P2 sign-off + 03'ün doğrulanmış parametreli sürümleri. |

## 11. Non-goals (MVP) & sonraki fazlar
- **MVP dışı:** gerçek/uzak hedef, backend, hesap, çok-oyunculu, MySQL/PG-özel payload, serbest SQL konsolu.
- **v1:** error/blind/stacked/second-order/WAF teknikleri, recon defteri, rozet, sandbox konsolu.
- **Sonrası:** blue-team modu, co-op/CTF race, prosedürel job, level editor.

## 12. Bağımlılıklar
Next.js (App Router), TypeScript, **Zod** (build-time level-JSON validation gate), sql.js
(+ `sql-wasm.wasm`), **framer-motion** (04 §13/§15 geçiş/animasyon), test runner (vitest),
lint/format. Statik export → Vercel. Harici runtime servisi yok (client-side).
