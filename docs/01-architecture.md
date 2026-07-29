# 01 — Teknik Mimari (SQL Heist)

> Gate 1 çıktısı. `00-vision.md`'in üstüne inşa edilen teknik kontrat.
> Statü: **TASLAK — kullanıcı/parent onayı bekliyor.** · Sürüm: v0.1
>
> **KANONİKLİK:** Bu doküman, level-JSON şemasının ŞEKLİ (alan adları + tipler),
> çekirdek engine/enjeksiyon kontratı ve win-condition DSL'i için **KANONİK** kaynaktır.
> 02 (planner) semantiği doldurur; 05 (data-modeler) alan-alan tip + seed detayını yazar;
> 03/04/06 buna atıfta bulunur. Hiçbir alt plan RAKİP şema tanımlayamaz.
> Çakışma kuralı: şema/engine/DSL → architect; puanlama/ipucu/loot-semantiği → planner.
>
> **DÜRÜSTLÜK NOTU:** Bilgi kesimim ~Ocak 2026. Sürüm-spesifik / kütüphane-API iddialarını
> satır içinde **(? doğrulanmalı)** ile işaretledim; hepsi §12'de toplu listede. Kurulumda
> (implementation fazı) kilitlenecek. Uydurma sürüm/sayı yok.
>
> **Ana doküman dokunulmadı:** `00-vision.md` değiştirilmedi (gate-driven disiplin).

---

## 0. Kapsam, ilkeler ve sahiplik

**Mimari tezi (tek cümle):** Oyunun tüm mantığı — gerçek SQLite motoru dahil — tarayıcıda,
tek bir statik bundle içinde çalışır; her level saf bir JSON verisidir; engine kodu
level'ler değişse de sabit kalır (§10 başarı kriteri: "yeni level = yeni JSON").

**Yönlendirici ilkeler:**
- **Data-driven engine:** Engine level'i BİLMEZ; sadece kanonik şemayı yorumlar. Yeni teknik
  eklemek = yeni JSON + (gerekirse) yeni win-condition DSL tipi; UI/engine dokunulmaz.
- **Şeffaflık = pedagoji:** Oluşan gerçek SQL her zaman görünür (vision §1). Enjeksiyon
  yolunda escape/sanitizasyon YOK — bu kasıtlı zafiyet, öğretilen şeyin ta kendisi.
- **Sandbox by construction:** Saldırı yalnızca bizim yarattığımız, geçici, in-memory bir
  SQLite DB'ye karşı yapılır. Gerçek hedef yok (vision §9).
- **Saf çekirdek, ince kabuk:** Engine (compose/exec/evaluate) framework-agnostik, saf,
  test edilebilir TS modülüdür; React sadece ince bir sunum kabuğudur.
- **Küçük dosya, yüksek uyum:** Coding-style kuralı (200–400 satır/dosya, fonksiyon <50 satır,
  immutability). Engine parça parça (composer / runner / evaluator / loader) ayrılır.

**Sahiplik (downstream ile iş bölümü):**

| Konu | Kanonik sahip | Dolduran / detaylandıran |
|------|---------------|--------------------------|
| Level-JSON şema ŞEKLİ (alan adı + tip + amaç) | **architect (bu doküman)** | 05 data-modeler (alan-alan tip + seed) |
| Enjeksiyon/engine kontratı (compose→exec→evaluate) | **architect** | — (03 payload'ları buna göre yazar) |
| Win-condition DSL biçimi | **architect** | 05 (JSON temsili), 02 (hangi loot = kazanç) |
| Input yüzeyi kararı | **architect** | 04 designer (UX'i giydirir) |
| Puanlama / ipucu / zorluk / loot-semantiği | **planner (02)** | 06 (in-world copy) |
| Payload + secure-fix DOĞRULUĞU | security-analyst (03) | — |
| Hedef DB şema + seed + loot satırı | data-modeler (05) | — |

> Not: Bu doküman engine-consumed alanların (query.template, target.fields[].name/surface,
> database.schemaSql/seedSql, winCondition.*, expectedSolution.inputs) **adını ve tipini**
> kilitler. Bu alanlar architect onayı olmadan değişmez (schemaVersion bump gerekir). Anlamsal
> alanlar (brief, debrief metni, hint metni, puan sayıları) 02/05/06 tarafından serbestçe dolar.

---

## 1. Next.js App Router yapısı

**Temel karar:** Statik export (`output: 'export'`, ? doğrulanmalı) — sunucu runtime'ı YOK.
sql.js WASM yalnızca tarayıcıda çalıştığından, oyunun tüm interaktif çekirdeği **Client
Component**'tir; Server Component'ler yalnızca statik kabuğu (metadata, tema, level JSON'u
build'de import edip prop olarak geçme) üretir.

### 1.1 Route / segment ağacı

```
app/
  layout.tsx                 # Server. Root HTML, fontlar, global tema, <ProgressProvider> kabuğu.
  page.tsx                   # Server. Landing / ana menü (statik) — "Soyguna başla".
  jobs/
    layout.tsx               # Server. Heist-arc çerçevesi (crew/handler framing, ilerleme çubuğu).
    page.tsx                 # Server. Job board — 3 job kartı + kilit/ilerleme durumu (statik).
    [jobId]/
      page.tsx               # Server. generateStaticParams() → front-door | vault | blueprint
                             #   3 job'u build'de pre-render eder. Level JSON'u import + Zod
                             #   validate eder, <JobPlayer level={...}/> client ağacına geçirir.
```

`generateStaticParams()` üç job id'sini (`front-door`, `vault`, `blueprint`) build'de üretir;
statik export bu sayede dinamik segmenti pre-render eder (? doğrulanmalı — statik export +
`generateStaticParams` App Router'da desteklenir).

### 1.2 Component sınırları (client ağacı)

Tümü `features/game/` altında, hepsi `'use client'`:

| Component | Sorumluluk |
|-----------|------------|
| `<JobPlayer level>` | Faz durum makinesini (`useReducer`) yönetir; engine session'ını `useRef`'te tutar. Tek orkestratör. |
| `<BriefPanel>` | Handler brifingi (narrative 06 metni). Faz: brief. |
| `<ReconPanel>` | Sahte hedef web app görünümü + `visibleSchema`'dan görünür şema kartı. Faz: recon. |
| `<ExploitConsole>` | **Input yüzeyi** (§6): mimik form alanları + canlı SQL preview. Faz: exploit. |
| `<SqlPreview>` | Compose edilen gerçek SQL'i CANLI, text olarak gösterir (şeffaflık). |
| `<ResultGrid>` | `db.exec` sonucunu (kolon + satır) veya SQLite hatasını text olarak gösterir. |
| `<LootBanner>` | Win olunca loot reveal. Faz: loot. |
| `<DebriefPanel>` | vuln kod ↔ secure kod yan yana + açıklama. Faz: debrief. |
| `<HintTray>` | Kademeli ipucu (02 semantiği). |

**Sınır kuralı:** sql.js ve compose/evaluate mantığı bir React component'i DEĞİL — `lib/engine/`
altında saf TS servisidir (§3). Component'ler bu servisi çağırır; WASM belleği `useRef` +
`useEffect` cleanup ile yönetilir (re-render churn'ü engellenir, level unmount'ta `dispose`).

### 1.3 Dizin yerleşimi (öneri)

```
app/…                        # yukarıdaki route ağacı (ince kabuk)
features/game/…              # client component'ler (yukarıdaki tablo)
lib/engine/                  # SAF ÇEKİRDEK (framework-agnostik, unit-test edilir)
  sqlLoader.ts               #   initSqlJs singleton (WASM yükleme)
  queryComposer.ts           #   template + inputs → composed SQL (§3)
  sqlRunner.ts               #   db.exec sarmalayıcı → {columns, rows, error}
  winEvaluator.ts            #   winCondition + context → {won, reason} (§5)
  levelSession.ts            #   taze DB yaşam döngüsü (load/run/reset/dispose)
lib/schema/
  level.ts                   #   Zod şeması + türetilen TS tipi (§4 kanonik)
content/levels/
  front-door.json  vault.json  blueprint.json   # 3 MVP level (saf veri)
public/
  sql-wasm.wasm              # WASM asset (statik servis; locateFile buraya işaret eder)
```

Bu ayrım "engine değişmeden yeni JSON = yeni level" garantisini yapısal olarak sağlar:
level içeriği `content/`'te, mantık `lib/engine/`'de, sunum `features/game/`'de.

---

## 2. sql.js entegrasyonu

sql.js = SQLite'ın WASM'e derlenmiş hali; tamamen tarayıcının WASM heap'inde, in-memory çalışır.
(sql.js 1.x, ? doğrulanmalı.)

### 2.1 WASM yükleme (singleton, lazy)

- `sql-wasm.wasm` (~1 MB, ? doğrulanmalı) `public/`'te statik servis edilir; `initSqlJs`'e
  `locateFile: () => '/sql-wasm.wasm'` (? doğrulanmalı — API imzası) verilir.
- `initSqlJs()` **bir kez** çağrılır ve dönen `SqlJsStatic` modülü modül-seviyesinde cache'lenir
  (singleton). İkinci job aynı modülü kullanır; WASM tekrar indirilmez.
- **Lazy / code-split:** `lib/engine/sqlLoader` job'a girilene kadar `import()` ile dinamik
  yüklenir → landing sayfası WASM taşımaz; ilk boyut küçük kalır.
- Yükleme durumu UI'ya sızdırılır: `loading | ready | error`. `error`'da retry butonu
  (resilience: graceful degradation).

### 2.2 Her level için TAZE DB

- Modül hazır olduğunda her level `new SQL.Database()` ile **taze, boş, in-memory** bir DB alır.
- Level açılışında sırayla çalışır: `db.run(level.database.schemaSql)` (DDL) →
  `db.run(level.database.seedSql)` (seed + loot satırları).
- **Reset:** oyuncu "yeniden dene" derse mevcut DB `dispose` edilir (`db.close()`), yenisi
  kurulur — böylece stacked/DROP gibi yıkıcı payload'lar bir sonraki denemeyi kirletmez.
- **İzolasyon:** DB'ler paylaşılmaz; job değişince eski session `dispose` edilir (bellek serbest).

### 2.3 Sorgu çalıştırma akışı

```
Level yüklenir → taze DB + schema + seed
      │
oyuncu input yazar (ExploitConsole)
      │
QueryComposer.compose(template, inputs)  →  composedSql   (§3, ham enjeksiyon, escape YOK)
      │
SqlPreview composedSql'i CANLI gösterir  (şeffaflık)
      │
oyuncu "çalıştır" → SqlRunner.exec(db, composedSql) → { columns, rows, error }
      │
WinEvaluator.evaluate(level.winCondition, context) → { won, reason }   (§5)
      │
won ? LootBanner + DebriefPanel  :  ResultGrid + feedback (tekrar dene)
```

- `db.exec(sql)` birden çok `;`-ayrık ifadeyi çalıştırıp sonuç kümesi dizisi döndürür
  (`{ columns, values }[]`, ? doğrulanmalı — dönüş şekli). MVP tek SELECT bekler; stacked
  query (v1) için çoklu-ifade desteği hazırdır.
- SQLite hatası (`error-based` teknikleri için kritik) yakalanır ve `error` alanına string olarak
  konur; UI'da text gösterilir (v1 error-based level'leri bunu win-condition input'u yapar).

### 2.4 Güvenli sandbox garantisi

Bu bir GÜVENLİK eğitim oyunu; sandbox garantisi sözleşmenin parçası:

1. **Ambient authority yok:** sql.js WASM'i varsayılan olarak dosya sistemi, ağ veya host
   JS/DOM erişimine sahip değildir. Emscripten FS'yi bağlamıyoruz → disk yok.
2. **Efemeral hedef:** Saldırı yalnızca bizim yarattığımız geçici in-memory DB'ye karşı.
   `DROP TABLE`, `; DELETE …` gibi payload'lar sadece o atılabilir DB'yi etkiler; reset = yeni DB.
3. **Gerçek hedef yok:** İçerik yalnızca SQLite payload'ları öğretir; uzak/gerçek sistem hedefi
   yok (vision §9 non-goal).
4. **Tek gerçek tarayıcı-yüzey riski = XSS:** payload/sonuç HTML olarak render edilirse
   `<img onerror=…>` çalışabilir. Mitigasyon §9-R1'de: her kullanıcı-etkili içerik React'in
   varsayılan text-escape'iyle basılır; engine çıktısında `dangerouslySetInnerHTML` YASAK.

---

## 3. ÇEKİRDEK ENGINE KONTRATI (en kritik)

Oyunun kalbi: oyuncu input'u, level'in **query template**'ine **ham string enjeksiyonu** ile
gömülerek gerçek SQL'i oluşturur. Bu kasıtlı zafiyettir — escape/parametrizasyon YOKTUR.
Aşağıdaki imzalar **kontrat** (tasarım), implementasyon değil.

### 3.1 Placeholder biçimi (KANONİK)

Query template, düz SQL + adlı input token'larıdır:

```
{{input:<fieldName>}}
```

- `<fieldName>`, `target.fields[].name` ile birebir eşleşir (login = `username` + `password`).
- Composer her token'ı, o alanın oyuncu-girdisi ham değeriyle değiştirir — **hiçbir escape/
  quote/tip dönüşümü yapmadan**. Aynı token birden çok kez geçebilir (hepsi değişir).
- Token dışındaki her şey sabittir ("sunucunun" yazdığı sorgu iskeleti).

Örnek template:
```sql
SELECT id, username, role FROM users
WHERE username = '{{input:username}}' AND password = '{{input:password}}'
```
`username = ' OR '1'='1' --` girilince composedSql:
```sql
SELECT id, username, role FROM users
WHERE username = '' OR '1'='1' --' AND password = '…'
```

### 3.2 Kontrat imzaları (design)

```ts
// KANONİK — alan/tip adları architect kilidinde.

// (a) Ham enjeksiyon — SAF, yan etkisiz. Oyunun zafiyeti burada YAŞAR.
interface QueryComposer {
  // inputFilter (WS3, opsiyonel): ham input'a substitution ÖNCESİ uygulanan WAF;
  // yoksa davranış aynen korunur.
  compose(template: string, inputs: Readonly<Record<string, string>>, inputFilter?: InputFilter): ComposedQuery
}
interface ComposedQuery {
  sql: string                              // ham enjeksiyondan sonraki GERÇEK SQL
  template: string                         // orijinal template (debrief diff için)
  inputs: Readonly<Record<string, string>> // kullanılan girdiler (debrief/telemetri)
  unresolved: string[]                     // değer verilmeyen token adları (validasyon)
  segments: ComposedSegment[]              // static/injected ayrımı (<SqlPreview> için)
  rejected?: boolean                       // WS3 WAF reddetti (yalnızca filter çalışınca)
  filterMessage?: string                   // WS3 WAF mesajı (rejected ise)
}
type ComposedSegment =
  | { kind: 'static'; text: string }
  | { kind: 'injected'; field: string; value: string }

// (b) Yürütme — DB üzerinde yan etkili; SQLite hatasını yakalar.
interface SqlRunner {
  exec(db: SqlDatabase, sql: string): ExecutionResult
}
interface ExecutionResult {
  composedSql: string
  columns: string[]
  rows: ReadonlyArray<ReadonlyArray<SqlCell>> // satır × hücre
  rowCount: number
  error?: string                              // SQLite mesajı (error-based teknikleri için)
  durationMs: number                          // time-based teknikleri (v1) + UX
  resultSetCount?: number                     // WS3 stacked-queries: satır üreten sonuç kümesi sayısı
}
type SqlCell = string | number | Uint8Array | null

// (c) Level oturumu — taze DB yaşam döngüsünü sarar; UI tek buradan konuşur.
interface LevelSession {
  run(inputs: Record<string, string>): ExecutionResult // compose + exec (evaluate AYRI, §5)
  reset(): void                                          // DB'yi at, schema+seed'i yeniden kur
  dispose(): void                                        // WASM belleğini serbest bırak
  readonly visibleSchema: VisibleTable[]                 // recon paneli için
}

// (d) Engine fabrikası — WASM singleton + level → session.
interface SqlEngine {
  init(): Promise<void>                        // initSqlJs (bir kez, cache)
  openLevel(level: Level): Promise<LevelSession> // taze DB + schema + seed
}
```

### 3.3 Sözleşme kuralları (dev'ler için — İHLAL EDİLEMEZ)

- **Enjeksiyon yolunda escape YOK.** `compose` asla quote kaçırmaz/parametrelemez. Bir dev
  "güvenlik açığını düzeltirse" oyun bozulur. Bu, koddan çok bir SÖZLEŞME kararıdır; §12 ve
  code-review checklist'inde işaretlenir.
- **compose SAF'tır** (DB'ye dokunmaz, deterministik) → izole unit-test edilir.
- **exec her zaman yakalar** — SQLite hatası exception olarak sızdırılmaz, `error` alanına gider.
- **evaluate exec'ten AYRIDIR** (§5) — SRP; win-condition mantığı DB/WASM bilmez (MVP saf tipleri).
- **compose ↔ debrief simetrisi:** Aynı `template` hem çalıştırılan zafiyetli sorgu hem de
  debrief'te gösterilen "vuln pattern"in kaynağıdır; `secureCode` bunun parametreli karşılığıdır
  (03 security-analyst doğruluğun sahibi).

> **Downstream:** 03, buradaki template biçimine göre çalışan payload üretir. 05, `target.fields`
> adlarını template token'larıyla eşleştirir ve seed'i template'in beklediği kolon şekline uydurur.

---

## 4. KANONİK LEVEL JSON ŞEMASI

Her level tek bir JSON dosyasıdır. Aşağıdaki tip **kanoniktir**: alan adları + tipleri architect
kilidinde. 05 (data-modeler) bunu alan-alan detaylandırır ve seed/şemayı doldurur; RAKİP şema
üretmez. Zod ile load/build zamanında valide edilir (geçersiz level = build/dev hatası).

Alanlar iki sınıfta: **[E] Engine-consumed** (adı/tipi architect kilidinde) ve
**[C] Content/semantik** (02/05/06 serbestçe doldurur).

```ts
// content/levels/*.json  ·  KANONİK v1
interface Level {
  // ---- Kimlik & meta ----
  schemaVersion: 1                 // [E] şema sürümü; kırıcı değişiklikte bump + migrasyon notu
  id: string                       // [E] slug; route [jobId] + ilerleme anahtarı (ör. "front-door")
  order: number                    // [C] heist yayındaki sıra (1,2,3)
  job: string                      // [C] job kod adı (ör. "The Front Door")
  title: string                    // [C] insan-okur başlık
  technique: TechniqueId           // [E] müfredat tekniği (enum, aşağıda) — engine/QA sınıflaması
  difficulty: 'intro'|'easy'|'medium'|'hard' // [C] planner zorluk eğrisi

  // ---- Anlatı (narrative 06 doldurur) ----
  brief: {                         // [C]
    handler: string                //     konuşan (ör. "The Fixer")
    text: string                   //     markdown brifing
    objective: string              //     tek satır loot hedefi
  }
  debrief: {                       // [C metin / 03 doğruluk]
    explanation: string            //     saldırı NEDEN çalıştı (markdown)
    vulnerableCode: CodeSnippet    //     zafiyetli sunucu kodu illüstrasyonu (string concat)
    secureCode: CodeSnippet        //     parametreli/prepared güvenli versiyon
    takeaway: string               //     tek cümle ders
  }

  // ---- Hedef yüzey (recon + input) ----
  target: {
    appName: string                // [C] sahte uygulama adı (ör. "AcmeCorp Admin")
    surface: SurfaceKind           // [E] hangi mimik UI render edilir (§6)
    fields: InputField[]           // [E] enjekte edilebilir girdiler (name = template token'ı)
  }

  // ---- Veritabanı (taze DB; 05 doldurur) ----
  database: {
    schemaSql: string              // [E] DDL: CREATE TABLE … (taze DB'de çalışır)
    seedSql: string                // [E] DML: INSERT … (seed + loot/flag satırları)
    visibleSchema: VisibleTable[]  // [E] recon'da GÖRÜNEN şema (gizli tablolar dışarıda → keşif)
  }

  // ---- Zafiyetli sorgu (enjeksiyonun kalbi, §3) ----
  query: {
    template: string               // [E] {{input:field}} token'lı zafiyetli SQL şablonu
    description?: string            // [C] dev notu (ör. "login kontrolü")
  }

  // ---- Kazanç koşulu (DSL, §5) ----
  winCondition: WinCondition       // [E] discriminated union (type'a göre)

  // ---- İpucu & çözüm & puan (02 doldurur) ----
  hints: Hint[]                    // [C] kademeli ipuçları
  expectedSolution: {              // [E-shape/C-value] test-harness bunu koşup won===true bekler
    inputs: Record<string, string> //     bilinen-iyi payload (ör. {username:"' OR '1'='1' --", password:"x"})
    note?: string                  //     açıklama (son-çare "çözümü göster")
  }
  scoring?: ScoringConfig          // [C] planner sahibi (base puan, ipucu cezası…) — opsiyonel

  tags?: string[]                  // [C] serbest etiket
}

// ---- Yardımcı tipler ----
type TechniqueId =
  | 'auth-bypass' | 'comment-injection' | 'column-count'
  | 'union-extraction' | 'schema-discovery'
  // WS3 post-MVP (frozen):
  | 'error-based' | 'blind-boolean' | 'blind-timing' | 'stacked-queries' | 'waf-bypass'
  // v1 (rezerve): 'second-order'

type SurfaceKind = 'login-form' | 'search-box' | 'url-param' | 'profile-lookup'

interface InputField {
  name: string                     // [E] template token adı ({{input:name}})
  label: string                    // [C] UI etiketi ("Username")
  type: 'text' | 'password' | 'search' | 'number' // [E] mimik input türü
  placeholder?: string             // [C] UI placeholder metni
}

interface VisibleTable {
  table: string                    // görünen tablo adı
  columns: string[]                // görünen kolonlar (loot tablosu Blueprint'te GİZLİ)
}

interface CodeSnippet { language: string; code: string } // debrief için düz metin (çalıştırılmaz)

interface Hint {
  id: string
  text: string                     // markdown ipucu
  cost?: number                    // [C] puan cezası (planner)
  revealAfterAttempts?: number     // [C] kaç denemeden sonra sunulur
}

interface ScoringConfig {          // [C] planner tanımlar; architect sadece alanı rezerve eder
  basePoints?: number
  hintPenalty?: number
  timeBonus?: boolean
}
```

**Kanoniklik kuralı:** `[E]` alanların adı/tipi bu dokümanda kilitlidir; değişiklik = architect
gate + `schemaVersion` bump. `[C]` alanlar 02/05/06 tarafından doldurulur. `WinCondition` §5'te.

---

## 5. Win-condition değerlendirme + DSL

Her sorgu çalıştıktan sonra, level'in `winCondition`'ı bir **saf değerlendiriciyle** (yan
etkisiz) çalıştırma sonucuna karşı ölçülür. Değerlendirici DB/WASM bilmez (MVP tipleri saf).

### 5.1 Değerlendirme mekanizması

```ts
interface WinEvaluator {
  evaluate(cond: WinCondition, ctx: WinContext): WinEvaluation
}
interface WinContext {              // exec sonucundan türetilir (§3.2)
  inputs: Readonly<Record<string, string>>
  composedSql: string
  columns: string[]
  rows: ReadonlyArray<ReadonlyArray<SqlCell>>
  rowCount: number
  error?: string
  resultSetCount?: number           // WS3 stacked-queries için (exec'ten taşınır)
}
interface WinEvaluation {
  won: boolean
  reason: string                    // UI feedback ("Admin satırı çekildi — içerdesin.")
}
```

Akış: `run()` → `ExecutionResult` → `WinEvaluator.evaluate(level.winCondition, ctx)`. `won`
ise loot+debrief; değilse `reason` ipucu-ayarlı feedback. Değerlendirici saf olduğundan her
level için tablo-testiyle (payload → beklenen won) doğrulanır (§9-R2).

### 5.2 DSL biçimi (discriminated union, `type` ayraç)

MVP üç tip; hepsi `type` alanına göre ayrışır. İki kanonik kazanç kipini karşılar:
**hedef satır** = `row-match`, **gizli flag** = `flag-in-result`.

```ts
type WinCondition =
  // (1) rows-returned — auth bypass: sorgu ≥min satır döndürdü mü? (kazanç = "içeri girdin")
  | { type: 'rows-returned'; min: number; max?: number; reason?: string }

  // (2) flag-in-result — GİZLİ FLAG: seed'lenmiş gizli değer sonuç ızgarasının HERHANGİ
  //     hücresinde göründü mü? (UNION extraction + schema-discovery loot'u)
  | { type: 'flag-in-result'; flag: string; column?: string; caseSensitive?: boolean; reason?: string }

  // (3) row-match — HEDEF SATIR: sonuç, beklenen satır(lar)ı içeriyor mu?
  | { type: 'row-match'; expect: Array<Record<string, SqlCell>>; mode: 'subset' | 'exact'; reason?: string }

  // ---- WS3 post-MVP (frozen; SAF + deterministik + golden-testable) ----
  // (4) error-based — HEDEFLİ HATA kazançtır (anti-trivial guard'dan ÖNCE, yalnız bu tip)
  | { type: 'error-based'; errorContains?: string; reason?: string }
  // (5) blind-boolean — boolean oracle TRUE dalı (satır döndü)
  | { type: 'blind-boolean'; reason?: string }
  // (6) blind-timing — timing oracle SEMBOLİK modellenir (wall-clock YOK; satır = TRUE)
  | { type: 'blind-timing'; reason?: string }
  // (7) stacked-queries — çok-ifadeli yan etki gözlemlenebilir (>=minResultSets sonuç kümesi)
  | { type: 'stacked-queries'; minResultSets?: number; reason?: string }

  // v1 (rezerve): bileşik operatörler
  // | { type: 'all-of' | 'any-of'; conditions: WinCondition[] }
```

**Değerlendirme semantiği:**
- `rows-returned` → `rowCount >= min && (max==null || rowCount <= max)`.
- `flag-in-result` → herhangi (veya `column` verildiyse o kolon) hücre, `flag` değerini içeriyor
  (string eşitlik / içerir; `caseSensitive` varsayılan false). `flag`, seed'de var olan gizli
  değerdir (oyuncuya gösterilmez); tek-kaynak için 05 seed'iyle birebir eşleşmeli.
- `row-match` → `subset`: beklenen her satır sonuçta var; `exact`: kümeler birebir. Alan
  eşleşmesi kolon adına göre.

### 5.3 Anti-trivial guard (pedagojik doğruluk)

Win-condition, enjeksiyon OLMADAN (boş/benign input) tetiklenmemeli — yoksa oyuncu öğrenmeden
kazanır. Bu, DSL'in değil **test-harness'ın** güvencesidir (§9-R2): her level için
(a) `expectedSolution.inputs` → `won===true`, (b) benign input → `won===false` assert edilir.
`rows-returned` kullanan Front Door'da base sorgu benign input'la 0 satır döndürmeli (seed buna
göre; 05 sorumlu).

> **Downstream:** 05, `winCondition`'ı JSON'da bu birleşim tiplerinden biriyle temsil eder ve
> `flag`/`expect` değerlerini seed'le tutarlı yazar. 02, hangi loot'un kazanç sayıldığının
> SEMANTİĞİNİ (hikaye düzeyinde) belirler; architect sadece BİÇİMİ kilitler.

---

## 6. INPUT YÜZEYİ KARARI (vision §12)

**KARAR:** **Mimik form-field (birincil) + her zaman görünür canlı "oluşan SQL" preview'ı.**
Serbest SQL konsolu (arbitrary SQL yazma) MVP'de YOK — v1'e ertelendi.

### 6.1 Seçenekler ve değerlendirme

| # | Seçenek | Artı | Eksi |
|---|---------|------|------|
| A | Form-field mimik (sahte login/arama) | Enjeksiyonun SIRADAN input'tan girdiğini öğretir (pedagojik kalp); gerçekçi recon | Uzun payload (UNION/sqlite_master) küçük alanda sıkışır |
| B | Kod-editör konsolu (serbest SQL) | Uzun payload rahat; "hacker terminali" hissi | "Input üzerinden enjeksiyon" dersini KAYBEDER; oyuncu keyfi SQL yazar, zafiyet noktası kaybolur |
| C | İkisi birden (katmanlı) | A'nın pedagojisi + B'nin rahatlığı | Tasarım/scope daha büyük |

### 6.2 Karar ve gerekçe

Seçilen: **C'nin disipline edilmiş hali** — A birincil, B'nin gücü A'nın İÇİNE gömülü:

1. **Pedagoji A'yı zorunlu kılar.** Vision §1: oyuncu enjeksiyonun sıradan bir input alanından
   (login/arama) girdiğini görmeli. Serbest konsol (saf B) bu dersi yok eder; bu yüzden B tek
   başına REDDEDİLDİ.
2. **Uzun payload sorunu, alanı büyüterek çözülür.** Her enjekte-edilebilir alan, form-field gibi
   davranan ama monospace + otomatik-büyüyen (textarea-vari) bir girdidir → `UNION SELECT NULL,
   NULL …` ve `sqlite_master` sorguları rahat sığar. Yani B'nin "uzun metin" faydası, A'nın
   dersini bozmadan alınır.
3. **Şeffaflık köprüsü = canlı SQL preview.** `<SqlPreview>` her zaman görünür; oyuncu "form"a
   yazdıkça compose edilen GERÇEK SQL canlı belirir (vision §1 "oluşan SQL şeffaf gösterilir").
   Bu, konsol hissini serbest-SQL riski olmadan verir.
4. **Yüzey level'e bağlı.** `target.surface` (login-form / search-box / url-param / profile-lookup)
   hangi mimik'in render edileceğini; `target.fields[]` hangi enjekte-edilebilir alanların
   olacağını sürer. Engine aynı; UI veriyle değişir.

**Ertelenen (v1):** Serbest-SQL "sandbox/free-play" modu — müfredat dışı deneme için ayrı bir mod;
MVP'nin güdümlü öğrenme akışını bulandırmasın diye kapsam dışı (vision §8 v1).

> **Downstream:** 04 (designer) bu kararı giydirir: mimik form + canlı SQL preview yerleşimi,
> monospace/auto-grow alan davranışı, `surface` başına ekran. Engine/şema bu karardan bağımsız.

---

## 7. State yönetimi + build/deploy

### 7.1 State yönetimi

İki kapsam, minimal araç (backend yok, §5):

- **Job-içi geçici state** (aktif faz, girdiler, son sonuç, açılan ipuçları, deneme sayısı):
  `<JobPlayer>` içinde `useReducer` ile bir **faz durum makinesi**. Global store gerekmez.
  Durum makinesi (discriminated-union action'lar), deterministik ve unit-test edilebilir:
  ```
  brief → recon → exploit ⇄ result → (won) → loot → debrief
                        ↑__________ tekrar dene (reset) __________|
  ```
- **Job-üstü ilerleme** (tamamlanan job'lar, skor): hafif `<ProgressProvider>` (React Context +
  `useReducer`), `localStorage`'a persist. Backend/hesap yok; ilerleme cihazda kalır.
- **Engine (sql.js) React state DEĞİL:** `LevelSession` imperatif servistir, `useRef`'te tutulur;
  level mount'ta `openLevel`, unmount'ta `dispose`. Böylece WASM belleği React render döngüsünden
  ayrık yönetilir.

Zustand vb. MVP'de gereksiz; ilerleme/skor karmaşıklaşırsa (v1 rozet/skor) değerlendirilir.

### 7.2 Build / deploy

- **Statik export:** `next.config` `output: 'export'` (? doğrulanmalı) → tamamen statik HTML/JS;
  sunucu runtime'ı yok. `next build` → `out/` dizini.
- **Pre-render:** `[jobId]` için `generateStaticParams()` üç job'u build'de üretir.
- **WASM asset:** `public/sql-wasm.wasm` statik servis; `locateFile` `/sql-wasm.wasm`'e işaret eder.
  `application/wasm` MIME'ıyla sunulmalı (Vercel statik asset'lerde sağlar, ? doğrulanmalı).
- **Level içeriği:** 3 küçük JSON build'de import + Zod-validate edilir (runtime fetch yok).
  Alternatif: `public/levels/`'ten lazy fetch (v1, çok level olunca).
- **Bundle disiplini:** engine + WASM dinamik `import()` ile job'a girilince yüklenir → landing
  hafif; ilk yük küçük.
- **Cross-origin isolation:** Standart tek-thread sql.js build'i SharedArrayBuffer gerektirmez →
  COOP/COEP header'ı GEREKMEZ (? doğrulanmalı — threaded build ayrı). Bu, saf statik host uyumunu
  korur.
- **Deploy:** Vercel statik (tek komut, §10). Saf statik olduğundan Netlify/GitHub Pages gibi
  herhangi statik host da çalışır — taşınabilirlik artı değeri.

---

## 8. Per-job engine skeleton (3 MVP job)

Aşağısı her job'un **engine-facing** iskeletidir: teknik → beklenen win-condition tipi → query
template şekli → yüzey → seed şekli. Anlatı/UX/tam seed 02/03/04/05/06'ya aittir; buradaki
şekiller LOCKED CONTRACT'ın çekirdeğidir (özellikle **Vault UNION kolon sayısı = 2**).

### 8.1 Job 1 · The Front Door — Auth bypass (teknik 1–2)

| Alan | Değer |
|------|-------|
| `technique` | `auth-bypass` |
| `target.surface` | `login-form` |
| `target.fields` | `username` (text), `password` (password) |
| `query.template` | `SELECT id, username, role FROM users WHERE username = '{{input:username}}' AND password = '{{input:password}}'` |
| `winCondition` | `{ type: 'rows-returned', min: 1 }` — enjeksiyonla ≥1 satır = giriş başarılı |
| Beklenen payload | `username: ' OR '1'='1' --`, `password: x` |
| Seed şekli (05) | `users(id, username, password, role)`; benign input **0 satır** döndürmeli (anti-trivial) |
| Loot | Admin paneline giriş (satırın kendisi = kanıt) |

### 8.2 Job 2 · The Vault — UNION-based extraction (teknik 3–4)

| Alan | Değer |
|------|-------|
| `technique` | `union-extraction` (önce `column-count`) |
| `target.surface` | `search-box` |
| `target.fields` | `q` (search) |
| `query.template` | `SELECT id, name, price FROM products WHERE name LIKE '%{{input:q}}%'` — **3 kolon** |
| `winCondition` | `{ type: 'flag-in-result', flag: 'LOOT-VAULT-9F2C4471' }` — gizli flag (account_ref) |
| Kolon sayısı | **3** (id, name, price) → UNION 3 kolonla eşleşmeli. `' ORDER BY 4 --` hata verir; `' ORDER BY 3 --` OK |
| Beklenen payload | `q: ' UNION SELECT holder_name, account_ref, balance_usd FROM offshore_accounts --` |
| Seed şekli (05) | görünür `products(id, name, price)` + BİLİNEN `offshore_accounts(holder_name, account_ref, balance_usd)`; `account_ref`'te loot |
| Loot | Kasa içeriği (gizli tablodaki değer) sonuç ızgarasında belirir |

> **Kritik uyum:** UNION kolon sayısı (3) → 03 payload'u ↔ 05 seed'i ↔ template birebir eşleşmeli.
> plan-reviewer bu uyumu denetler (orchestration §3b-7).

### 8.3 Job 3 · The Blueprint — Schema discovery (teknik 5)

| Alan | Değer |
|------|-------|
| `technique` | `schema-discovery` |
| `target.surface` | `search-box` (veya `profile-lookup`) |
| `target.fields` | `q` (search) |
| `query.template` | `SELECT title, body FROM articles WHERE title LIKE '%{{input:q}}%'` — **2 kolon** |
| `winCondition` | `{ type: 'flag-in-result', flag: 'LOOT-BLUEPRINT-3D1F8A22' }` — gizli flag (payload) |
| Beklenen payload | 1) `q: ' UNION SELECT name, sql FROM sqlite_master WHERE type='table' --` (tabloyu keşfet) → 2) `q: ' UNION SELECT schematic_id, payload FROM z_bp_registry_7f3a --` (loot'u çek) |
| Seed şekli (05) | görünür `articles(title, body)` + **GİZLİ** `z_bp_registry_7f3a(schematic_id, payload)`; `visibleSchema` bu tabloyu LİSTELEMEZ (keşif gerçekten gerekli) |
| Loot | Şemayı haritalayıp gizli tablodan blueprint flag'ini çıkarma |

> `visibleSchema`'nın loot tablosunu gizlemesi, `sqlite_master` keşfini zorunlu kılan yapısal
> mekanizmadır (SQLite `sqlite_master`'ı standart açığa çıkarır — SQLite-özgü not, 05/03).

### 8.4 Ortak invariant'lar
- 3 job da tek SELECT template + ham enjeksiyon (§3) + saf win-eval (§5) kullanır → **engine
  ortak, sadece JSON değişir** (data-driven kanıtı, §10 başarı kriteri).
- Her job `expectedSolution.inputs` taşır → test-harness solvability + anti-trivial'i doğrular.

---

## 9. Riskler + mitigasyon

**R1 — XSS (asıl gerçek güvenlik yüzeyi).** Oyuncu payload'ı ve sorgu sonuçları (enjekte edilmiş
string içerebilir) UI'da gösterilir; HTML olarak render edilirse `<img src=x onerror=…>` çalışır.
Bir güvenlik oyununun kendisinin XSS'e açık olması ironik ve kabul edilemez.
→ *Mitigasyon:* Tüm kullanıcı-etkili içerik (composedSql, input echo, sonuç hücreleri, hata mesajı)
React varsayılan text-escape'iyle basılır; engine çıktısında `dangerouslySetInnerHTML` **YASAK**;
code-review + security-reviewer checklist maddesi; CSP header (statik host destekliyorsa).

**R2 — Level çözülemez veya bedava-çözülür (içerik/engine drift).** El-yazımı JSON'da
win-condition hiçbir amaçlanan payload'la sağlanmayabilir ya da enjeksiyon olmadan trivial geçebilir
(ör. base sorgu benign input'la zaten satır döndürür).
→ *Mitigasyon:* Build/CI **test-harness**: her level için (a) `expectedSolution.inputs` → `won===true`,
(b) benign/boş input → `won===false` (anti-trivial). Şemadaki `expectedSolution` tam bunun için var.
Dev-QA loop'a bağlanır (tdd-guide + mocksmith fixture'ları).

**R3 — WASM yükleme hatası / bundle şişmesi.** ~1 MB WASM (? doğrulanmalı) yanlış path/MIME,
ağ hatası ya da ilk-yük şişmesiyle başarısız olabilir.
→ *Mitigasyon:* engine + WASM'i job'a girince dinamik `import()` ile lazy yükle; modülü singleton
cache'le; `loading|ready|error` durumu + retry (resilience: graceful degradation); `locateFile`
path'ini doğrula; tek-thread build ile COOP/COEP header ihtiyacını ele (? doğrulanmalı) → statik host uyumu.

**R4 — Şema sürüklenmesi (02–06 arası).** Level-JSON şeması kanonik ve tüm alt planlarca tüketilir;
gelişigüzel bir alan değişikliği downstream'i (05 seed, 03 payload, 04 UI, test-harness) kırar.
→ *Mitigasyon:* `schemaVersion` alanı + tek Zod validatörü + bu dokümanın kanonik referansı; her
şema değişikliği architect-gate + sürüm bump + migrasyon notu (kullanıcının gate-driven + tek-kaynak
disiplini). plan-reviewer 01↔05 tutarlılığını denetler.

**R5 (ikincil) — Ders bütünlüğü vs serbest güç.** Input serbest SQL'e açılırsa "input üzerinden
enjeksiyon" dersi kaybolur (§6-B).
→ *Mitigasyon:* MVP'de yüzey mimik-form + canlı preview'la sınırlı; serbest-SQL konsolu v1 sandbox
moduna ertelendi.

---

## 10. Implementation agent roster (PLAN.md §7'ye besleme)

Bu, **implementation fazı** için component→agent haritasıdır (agent-assignment-matrix uyumlu;
isimler `~/.claude/agents/`'te doğrulandı). Parent PLAN.md §7'de faz-faz kullanır.

| Component / iş | Executing agent | QA agent(lar) |
|----------------|-----------------|---------------|
| Çekirdek engine (composer / runner / evaluator / session, sql.js) — TDD | **kraken** | code-reviewer + verifier + **security-reviewer** (XSS yüzeyi) |
| Level-JSON şeması + Zod validasyon | **backend-dev** | **schema-validator** + code-reviewer |
| Win-condition test-harness (solvability + anti-trivial) | **tdd-guide** (+ **mocksmith** fixture) | verifier |
| UI component'ler (JobPlayer, ExploitConsole, SqlPreview, ResultGrid, DebriefPanel, faz makinesi) | **frontend-dev** | code-reviewer + **a11y-expert** (ops.) |
| Next.js iskelet + statik export + WASM asset + Vercel deploy | **frontend-dev** + **devops** / **shipper** | verifier |
| Level içeriği (JSON) — seed/şema | **data-modeler** (05'ten) → **backend-dev** | code-reviewer |
| Güvenlik içeriği imzası (payload + secure-fix doğruluğu) | **security-analyst** (03'ten) | **security-reviewer** |

Engine-facing kritik QA kapıları: (1) her level test-harness'tan geçer (R2), (2) security-reviewer
XSS + içerik doğruluğu onayı (vision §10), (3) verifier statik build + deploy smoke.

---

## 11. Downstream sözleşmesi (02–06 ne tüketir)

| Doküman | Bu dokümandan tükettiği (kanonik) | Sahiplendiği (semantik) |
|---------|-----------------------------------|-------------------------|
| 02 planner | Şema alan adları, `winCondition` biçimi, per-job skeleton (§8) | Puanlama, ipucu merdiveni, zorluk, hangi loot=kazanç |
| 03 security-analyst | Engine kontratı (§3), template biçimi, per-job template şekli (§8) | Çalışan payload + secure-fix DOĞRULUĞU |
| 04 designer | Input yüzeyi kararı (§6), component sınırları (§1.2), şeffaf-SQL preview | Noir tema, 5 ekran, wireframe |
| 05 data-modeler | KANONİK şema (§4), `winCondition` DSL (§5), `database.*`/`target.fields` alanları | Alan-alan tip detayı, hedef DB şema+seed+loot, ER |
| 06 copywriter | Job yayı + `brief`/`debrief` alanları (§4) | In-world brief/loot/debrief copy, handler sesi |

**Çakışma protokolü (gate-driven):** İki alt plan çelişirse — şema/engine/DSL için **architect
kanonik**, puanlama/ipucu/loot-semantiği için **planner kanonik** (orchestration §replan). Şema
değişikliği gerekiyorsa: architect-gate + `schemaVersion` bump + değişiklik günlüğü.

---

## 12. Doğrulanacaklar listesi (honesty markers — toplu)

Bilgi kesimim ~Ocak 2026; aşağıdakiler implementation fazında (kurulumda) doğrulanacak.
Hiçbiri mimari kararı değiştirmez; yalnızca sürüm/API ayrıntısıdır.

1. Next.js `output: 'export'` statik export + `generateStaticParams` ile dinamik segment
   pre-render — güncel Next.js sürümünde config anahtarı/davranışı. **(? doğrulanmalı)**
2. sql.js sürümü (1.x) ve `initSqlJs({ locateFile })` imzası. **(? doğrulanmalı)**
3. `db.exec(sql)` dönüş şekli (`{ columns: string[]; values: any[][] }[]`). **(? doğrulanmalı)**
4. `sql-wasm.wasm` boyutu (~1 MB). **(? doğrulanmalı)**
5. Tek-thread sql.js build'i SharedArrayBuffer/COOP-COEP gerektirmez (threaded build ayrı).
   **(? doğrulanmalı)**
6. Vercel statik asset'leri `application/wasm` MIME'ıyla sunar. **(? doğrulanmalı)**

Yüksek güvenli (standart SQLite davranışı, işaretlenmedi): `--` yorum, `sqlite_master`,
`UNION SELECT`, `ORDER BY n`, `LIKE`, tautology (`' OR '1'='1'`).

---

## Değişiklik günlüğü

| Sürüm | Tarih | Değişiklik |
|-------|-------|-----------|
| v0.1 | 2026-07-29 | İlk taslak (Gate 1 architect çıktısı). Kanonik level-JSON şeması, engine/enjeksiyon kontratı, win-condition DSL, input yüzeyi kararı, 3-job skeleton, riskler, roster. |

