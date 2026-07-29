# LOCKED CONTRACT — Gate 1 → Gate 2 (SQL Heist)

> Parent (Hızır) tarafından `01-architecture.md` (architect — şema/engine/DSL için KANONİK)
> + `02-game-design.md` (planner — tasarım/skor/ipucu için KANONİK) uzlaştırılarak donduruldu.
> Gate 2 agent'ları (03/04/05/06) buna **harfiyen** uyar. Çelişkiler aşağıda çözüldü.

## A. Kanonik level-JSON şeması (architect — 01)
Alanlar ([E] = engine tüketir, architect kilidi · [C] = semantik, 02/05/06 doldurur):
```
schemaVersion [E], id [E], order [C], job [C], title [C], technique [C],
difficulty [C],
brief { handler, text, objective } [C],
debrief { explanation, vulnerableCode, secureCode, takeaway } [C],
target { appName, surface, fields[] } [E: surface],
database { schemaSql, seedSql, visibleSchema[] } [E],
query { template, description } [E: template],
winCondition [E],
hints[] [C],
expectedSolution { inputs } [E],
scoring? [C], tags? [C]
```
RAKİP şema üretilmez; sadece bu alanlar detaylandırılır.

## B. Enjeksiyon kontratı (DONMUŞ)
`query.template` içindeki `{{input:field}}` yer tutucusu, oyuncunun **HAM** input'uyla
değiştirilir — **escape/parametrizasyon YOK** (vulnerable-by-design). Oyunun çekirdek
mekaniği budur. Güvenli versiyon yalnızca debrief'te (illüstrasyon) gösterilir.

## C. Win-condition DSL (architect isimleri KANONİK)
`type` üzerinden tagged union:
- `rows-returned { min, max? }` — dönen satır sayısı aralıkta.
- `flag-in-result { flag, column? }` — belirli bir değer sonuçta görünür (`column` opsiyonel =
  tüm kolonlarda ara). **Bu, planner'ın "value-contains" primitifidir.**
- `row-match { expect: Array<Record<string,SqlCell>>, mode: "subset"|"exact" }` — dönen
  satırlardan en az biri `expect` dizisindeki bir girdiyle eşleşir (01 §5.2 + 05 §1.3 kanonik).

Saf `WinEvaluator.evaluate(cond, ctx) → {won, reason}`; query exec'ten AYRIK; anti-trivial
guard test-harness'ta.

## D. 3 MVP job — DONMUŞ skeleton
Parent reconciliation kararları:
- Win-condition isimleri architect DSL'ine birleştirildi (planner "value-contains" → `flag-in-result`;
  "privileged-row" → `row-match`).
- **UNION kolon sayıları KİLİTLİ** (security payload ↔ data-modeler seed birebir eşleşmeli):
  **Vault = 3 kolon**, **Blueprint = 2 kolon** — bilerek farklı, oyuncu her job'da kolon
  sayısını yeniden keşfetsin (pedagoji). Architect'in illüstratif "Vault=2" skeleton'ını geçersiz
  kılar; kolon sayısı per-level tasarım/veri kararıdır (planner+data-modeler sahibi), architect
  şema/engine için kanonik kalır.

| Job | Teknik | Recon yüzeyi | UNION kolon | Loot kavramı | Win-condition (kanonik DSL) |
|---|---|---|---|---|---|
| **Front Door** | tautology + `--` (T1–2) | login formu | yok | admin erişimi | `row-match { expect:[{is_admin:1}], mode:"subset" }` |
| **The Vault** | kolon-sayısı + UNION (T3–4) | arama kutusu | **3** | BİLİNEN tablodaki gizli hesap değeri | `flag-in-result { flag:"<vault loot>", column? }` |
| **The Blueprint** | `sqlite_master` keşfi → UNION (T5) | arama / URL param | **2** | BİLİNMEYEN (keşfedilen) tablodaki değer | `flag-in-result { flag:"<blueprint loot>", column? }` |

Kesin loot string değerlerini data-modeler seed'de tanımlar; security-analyst payload'ları TAM
o değerleri çıkarır; **kolon sayıları DONDURULDU.**

## E. Input yüzeyi (architect kararı — DONMUŞ, vision §12 çözüldü)
Mimik form-field(ler) (birincil) + her zaman görünür canlı **"oluşan SQL" preview** paneli.
MVP'de serbest SQL konsolu YOK (v1 sandbox'a ertelendi). `target.surface` hangi mimik UI'yi
sürer (login / search / url-param). designer + copywriter buna hizalanır.

## F. Scoring nesnesi (planner — architect'in `scoring?` alanına oturur)
```
scoring = { base:1000, freeAttempts:3, attemptPenalty:A,
            hintCosts:[50,150,300], parTimeSec:{frontDoor:180, vault:300, blueprint:420},
            timeBonusRate:TB, timeBonusCap:cap, minScore:MIN }
```
`jobScore = clamp(base − A·max(0, failedRuns−freeAttempts) − Σ(usedHintCosts)
            + min(cap, TB·(parTime − actualTime)), min = minScore)`
Yıldız: 900 / 600 / tamamlama. Pozitif çerçeve — ilerlemeyi asla bloklamaz.

## G. İpucu sistemi (planner)
Job başına 3 kademe: nudge → teknik → near-solution. Talep üzerine, sıralı açılım;
kademe index'i `hintCosts[]` ile eşleşir. Soft-trigger önerir, otomatik açmaz.
