# 04 — Frontend / UX Tasarım (SQL Heist)

> Gate 2 çıktısı (designer). Dayanak: `00-vision.md`, `01-architecture.md` (input yüzeyi §6 +
> component sınırları §1.2 — KANONİK), `02-game-design.md` (döngü ekranları), `locked-contract.md`.
> Statü: **TASLAK — planlama fazı.** Sürüm: v0.1
>
> **KAPSAM:** Bu doküman tasarım KARARLARI + wireframe-seviye TARİF içerir. **Gerçek React/CSS
> kodu YOKTUR.** Token tabloları, tipografi ölçeği ve Tailwind class *ipuçları* birer spesifikasyondur
> (implementasyon fazında frontend-dev + design-to-code skill'i giydirir).
>
> **SAHİPLİK:** Noir tema, 5 ekran, şeffaf-SQL yerleşimi, component wireframe'leri → designer (bu doküman).
> Engine/şema/DSL → architect (01). Skor/ipucu/loot-semantiği → planner (02). In-world copy → copywriter (06).
> Payload/secure-fix doğruluğu → security-analyst (03). Bu doküman **rakip karar üretmez**; kararları giydirir.

---

## 0. Tasarım tezi (tek cümle)

Oyuncu, karanlık bir masada tek bir lamba altında açılmış bir **dosya + ops konsolu** karşısındadır;
saldırdığı sahte uygulamanın "ön yüzü" ile o input'un veritabanına çarpan **gerçek SQL**'i yan yana
görür — ve bu iki yüzey arasındaki köprü (input → oluşan SQL) oyunun hem gerilimi hem de dersidir.

**Neden (kullanıcı amacı):** Hedef kitle "SQL bilen ama injection'a yabancı geliştirici" (vision §2).
Bu kullanıcı, payload'ın *sıradan bir input alanından* girip *sorgu mantığını* nasıl değiştirdiğini
GÖRMELİDİR. Tasarımın tek işi bu görünürlüğü maksimize etmek — dekorasyon değil.

**Stil seçimi:** **Dark-First + Data-Dense (hibrit).** UI stil kataloğu: dark-first = "dev tool /
media / oyun → developer kitlesi". Bu oyun tam bu kesişimde. Karanlık zemin ayrıca kod/renk
vurgusunu (syntax highlight, injected-token) en yüksek kontrastla taşır → pedagojik gerekçe, sadece
mood değil. Fintech anti-pattern'i (düşük kontrast/neon) BİLEREK dışlanır: yüksek kontrast + neon YOK.

---

## 1. Görsel Tema — Noir + Heist Gerilimi

### 1.1 Mood & atmosfer yönü
- **Film-noir, low-key aydınlatma.** Saf siyah DEĞİL (yasak) — derin mavi-antrasit zemin, tek sıcak
  ışık havuzu (brass amber). Chiaroscuro: içerik aydınlık adacıklarda, çevre gölgede.
- **Restraint (Dieter Rams "Less, but better").** Boşluk = nefes + odak. Süsleme yok; her vurgu bir
  anlam taşır. Neon glow, gradient-text-on-heading, custom cursor → YASAK (anti-slop).
- **Doku:** çok hafif film-grain + vignette (opacity düşük, kontrastı BOZMAZ, `prefers-reduced-motion`
  ve düşük-güç modunda kapanır). Amaç sinematik his; okunabilirliği asla düşürmez.
- **In-world çerçeve:** ekranlar "dosya / dossier / ops laptop" gibi okunur. Panel başlıkları
  daktilo-stampli ("CASE FILE", "THE WIRE", "SECURED") — copywriter sesi (06) doldurur.

### 1.2 Semantik Renk Yasası (pedagojik omurga — TÜM ekranlarda sabit)

Renk burada bilgi taşır, süs değil. Üç anlam tüm oyunda değişmez:

| Anlam | Renk ailesi | Nerede |
|-------|-------------|--------|
| **ATTACK / injection / tehlike / hata** | Crimson (kırmızı) | Injected SQL segmenti, SQLite hata, `vulnerableCode` |
| **DEFENSE / güvenli / kazanıldı** | Jade (yeşil) | Loot secured, `secureCode`, win feedback |
| **AGENCY / oyuncu / navigasyon / birincil aksiyon** | Brass (amber) | Butonlar, link, focus ring, "crew" araçları |
| **INFO / ilerleme / intel (nötr)** | Steel (soğuk mavi) | Milestone sinyali, ipucu paneli, SQL keyword highlight |

> **Erişilebilirlik uyarısı (kritik):** Kırmızı↔yeşil, renk körlüğünün EN kötü çifti. Bu yüzden
> attack/defense ASLA yalnızca renkle ayrılmaz — her zaman **ikon + etiket + konum** ile pekiştirilir
> (WCAG 1.4.1 "use of color"). Debrief'te "VULNERABLE" (kırık kilit ikonu) vs "SECURE" (kilit ikonu)
> yazılı+ikonlu; injected segment renk + alt-çizgi + "break-out" işareti taşır.

### 1.3 Renk paleti — token tablosu (HEX + CSS variable, dark-native)

> **Not:** MVP **dark-only**. Light mode YOK — noir mood'u bozar ve kullanıcı ihtiyacı değil
> ("less, but better"). Token mimarisi 3 katman (design-to-code skill): primitive → semantic →
> component. Component'ler primitive'e ASLA direkt referans vermez. Aşağıdaki HEX'ler öneri;
> implementasyonda kontrast AA (4.5:1 metin / 3:1 büyük+UI) doğrulanır.

**Primitive — yüzeyler & mürekkep**
```
--noir-900  #0B0D10   app zemin (saf siyah değil)
--noir-850  #121519   surface (panel, kod yüzeyi)
--noir-800  #1A1E24   raised (kart, input, modal)
--noir-700  #2A2F37   border / hairline
--noir-600  #3A414B   güçlü border, divider
--ink-50    #ECEEF2   birincil metin (off-white)      → noir-900 üstünde ~15:1
--ink-300   #9AA3AD   ikincil metin                    → ~7:1
--ink-500   #7B8492   muted / meta (yalnız büyük/meta) → ~5:1
```
**Primitive — semantik aksanlar**
```
--brass-400 #E2A950   AGENCY birincil          --brass-500 #C7912F  hover/active
--crimson-400 #F06565 ATTACK metin/vurgu        --crimson-500 #D6453F solid   --crimson-950 #2A1113 tint-bg
--jade-400  #4FB783   DEFENSE metin/vurgu       --jade-500  #2E9C68  solid    --jade-950  #0E211A tint-bg
--steel-400 #86B3D6   INFO/keyword              --steel-950 #0E1B24 tint-bg
```
**Semantic (component'ler BUNLARI kullanır)**
```
--bg            = --noir-900      --surface       = --noir-850     --surface-raised = --noir-800
--border        = --noir-700      --border-strong = --noir-600
--text          = --ink-50        --text-secondary= --ink-300      --text-muted     = --ink-500
--primary       = --brass-400     --primary-hover = --brass-500    --focus-ring     = --brass-400
--danger        = --crimson-400   --danger-solid  = --crimson-500  --danger-subtle  = --crimson-950
--success       = --jade-400      --success-solid = --jade-500     --success-subtle = --jade-950
--info          = --steel-400     --info-subtle   = --steel-950
```
**Component token örnekleri (semantic'ten türer)**
```
--btn-primary-bg = --primary        --btn-primary-fg = --noir-900 (koyu metin, amber üstünde AA)
--injected-fg    = --crimson-400    --injected-bg    = --crimson-950   (injected SQL segmenti)
--sql-keyword    = --steel-400      --sql-string     = #C9B072  --sql-number = #C99A6B
--sql-comment    = --ink-500 (italik + %60 opacity → "inert/yorumlandı")
```
**Tailwind mapping (ipucu):** `tailwind.config` → `colors.primary=var(--primary)`, `bg`, `surface`,
`danger`, `success`, `info` semantic var'lara bağlanır. Kullanım: `bg-surface text-text border-border`.

### 1.4 Tipografi

**Bu oyun kod-merkezlidir → monospace baş roldedir.** (SQL, payload, sonuç grid, hedef URL hep mono.)
Font tercihleri (skill kuralı: **Inter YASAK**):

| Rol | Font | Neden |
|-----|------|-------|
| Display / başlık ("LOOT SECURED", job adı) | **Space Grotesk** | Geometrik-teknik, hafif noir karakter |
| UI / gövde metin | **Geist Sans** | Nötr, dev-native, Space Grotesk ile uyumlu |
| **Kod yüzeyi (SQL/payload/sonuç/URL)** | **Geist Mono** | Ailede tutarlı; **ligature KAPALI** (aşağıda) |

> **Kritik pedagojik kural — ligature OFF:** SQL preview'da `font-variant-ligatures: none`. Ligature
> `--`, `!=`, `<>` gibi karakterleri TEK glif'e birleştirip oyuncudan gizler → yorum injection'ı
> öğreten oyun için felaket. Oyuncu **birebir karakteri** görmeli. Ligature yalnız kod yüzeyinde kapalı.

**Type scale (px / line-height → Tailwind)** — gövde mobilde min 16px (named rule: body-font):
```
Display   36px / 40  tracking-tight   → text-4xl   (Loot başlık; mobil 30px text-3xl)
H1        30px / 36                    → text-3xl
H2        24px / 32                    → text-2xl   (panel başlık)
H3        20px / 28                    → text-xl
Body      16px / 24                    → text-base  (min mobil; okunur gövde)
Small     14px / 20                    → text-sm    (ikincil, meta)
Micro     12px / 16  tracking-wide     → text-xs    (stamp etiket, kolon başlık)
Mono-body 14px / 22                    → font-mono text-sm  (SQL/sonuç; okunur code)
Mono-lg   16px / 26                    → font-mono text-base (Exploit SQL preview — hero code)
```
**Line-length (named rule):** brief/debrief prose `max-w-[65ch]` (45–75 karakter) — okunabilirlik.

### 1.5 Spacing & şekil
- **4px/8px grid** (named rule: tutarlı spacing). Component'ler 4/6/8; layout 8/12/16 (design-to-code).
- **Radius:** `sm 6px` (input/buton) · `md 10px` (kart/panel) · `lg 16px` (modal/loot kartı) · `full` (durum noktası).
- **Elevation (noir):** near-black üstünde büyük drop-shadow işe yaramaz → yükseklik **border + ince iç-
  highlight** ile: `border --noir-700` + üstte `inset 0 1px 0 rgba(255,255,255,.04)` (restrained "liquid glass").
- **Max genişlik:** oyun konsolu `max-w-[1200px] mx-auto px-4 sm:px-6`; prose blokları `max-w-[65ch]`.

---

## 2. Global kabuk (chrome) — her ekranda sabit

Tek orkestratör `<JobPlayer>` (architecture §1.2) faz makinesini sürer; kabuk üstte sabit kalır,
içerik faz'a göre değişir (`AnimatePresence` ile geçiş, §7 motion).

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [SQL HEIST]   Front Door · Recon    ● Brief ─ ● Recon ─ ○ Exploit ─ ○ Loot ─ ○ Debrief   [timer] 01:12   ★ 850   [mute] │  ← TopBar (h ~56px)
├──────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│                        [ FAZ İÇERİĞİ — değişir ]                           │
│                                                                            │
└──────────────────────────────────────────────────────────────────────────┘
```
- **TopBar (`<TopBar>` + `<PhaseStepper>`):** sol = oyun logosu + "job · faz"; orta = 5-adım stepper
  (tamamlanan=jade nokta, aktif=brass halka, kilitli=muted); sağ = timer (Exploit'te başlar, §02) +
  skor + ses toggle. Stepper **nav-depth = 1** (job içi tek seviye) — named rule (max 3) rahat karşılanır.
- **Timer davranışı:** Brief/Recon'da gri/duraklı; Exploit'e girince brass'a döner ve sayar (planner §02:
  brief okuması cezasız). İkon `phosphor: timer`.
- **z-index scale (named rule):** dropdown 10 · modal/hint-confirm 50 · toast/milestone 100.
- **Ekran genişliği:** kabuk `max-w-[1200px]`; TopBar sticky `top-0`.

---

## 3. Ekran 1 — BRIEF ("İş geliyor")

**Kullanıcı amacı:** Handler işi verir; gerilim + motivasyon kurulur; teknik SPOIL edilmeden kategori
telegraf edilir (planner §2.1). Oyuncu buradayken engine/WASM arka planda lazy yüklenir (§01 §2.1) →
Exploit'e varınca hazır (algılanan hız).

**Layout — asimetrik "dossier" (DESIGN_VARIANCE yüksek → centered hero YOK):**
```
┌───────────────────────────────────────────────────────────────┐
│  CASE FILE ▾                                    RETAINER: ▓▓▓▓  │  ← stamp başlık + payout
│  ┌─────────────────────────────┐   ┌───────────────────────┐   │
│  │ ◐ THE FIXER                 │   │  TARGET                │   │  ← sağ: hedef künyesi
│  │   "handler avatar / siluet" │   │  AcmeCorp Admin        │   │
│  │                             │   │  surface: login        │   │
│  │  [brief metni — noir ton]   │   │  classification: ▓▓    │   │
│  │  markdown, max-w-[65ch]     │   │                        │   │
│  │  ...tekniği spoil etmez...  │   │  OBJECTIVE             │   │
│  │                             │   │  › admin erişimi al    │   │  ← tek satır loot hedefi
│  └─────────────────────────────┘   └───────────────────────┘   │
│                                                                 │
│                                   [ Take the job → ]  (brass)   │  ← birincil CTA, sağ-alt
└───────────────────────────────────────────────────────────────┘
```
- **`<BriefPanel>`:** sol geniş kolon = handler kartı (`<HandlerCard>`: codename + siluet + konuşma
  metni); sağ dar kolon = hedef künyesi + OBJECTIVE. Işık: sol panel lamba havuzunda, sağ künye gölgede.
- **CTA:** "Take the job →" (copy 06), brass solid, sağ-altta (Z-okuma sonu). Tek net aksiyon.
- **Mobil:** tek kolon; handler kartı üstte, künye altında, CTA full-width sticky-bottom.

**State'ler:**
- **loading (engine warm-up):** CTA yanında ince "prepping the gear…" satırı; engine `ready` olana kadar
  CTA yine tıklanır (Recon engine gerektirmez) — bloklamaz. 300ms altı gecikmede loader gösterme (named rule).
- **reduced-motion:** handler metni typewriter yerine anında görünür.

---

## 4. Ekran 2 — RECON ("Hedefi keşfet")

**Kullanıcı amacı:** Sahte hedef web app'i incele; enjeksiyon yüzeyini KENDİ bul (planner §2.2).
**Query template burada GİZLİ** — gösterilirse bulmaca çözülür. Şeffaf SQL, Exploit'te belirir.

**Layout — sahte tarayıcı çerçevesi ("target's site") + recon notları:**
```
┌───────────────────────────────────────────────────────────────┐
│ ┌───────────────────────────────────────────┐  ┌────────────┐ │
│ │ ◐ ◐ ◐   lock: acmecorp-admin.internal/login  │  │ RECON      │ │  ← sahte BrowserChrome
│ │─────────────────────────────────────────────│  │ NOTES      │ │    (adres barı = url-param
│ │                                             │  │            │ │     job'ında injection noktası)
│ │        [ AcmeCorp Admin ]  (logo)           │  │ visibleSch:│ │
│ │                                             │  │  users     │ │  ← visibleSchema (01 §4)
│ │        Username [_______________]           │  │   id       │ │    Blueprint'te loot tablosu
│ │        Password [_______________]           │  │   username │ │    LİSTELENMEZ → keşif zorunlu
│ │                 [ Sign in ]                 │  │   role     │ │
│ │                                             │  │            │ │
│ │   "bu form bir sorguya konuşuyor olmalı…"   │  │ [hipotez]  │ │  ← nötr ipucu (steel), spoil yok
│ └───────────────────────────────────────────┘  └────────────┘ │
│                                        [ Move in → ] (brass)    │
└───────────────────────────────────────────────────────────────┘
```
- **`<ReconPanel>` + `<BrowserChrome>`:** sol = `target.surface`'e göre render edilen mimik app
  (login-form / search-box / url-param) — ama **pasif** (recon'da çalıştırma yok, sadece inceleme).
  Sağ = `<ReconNotes>`: `visibleSchema` kartı (görünen tablo/kolonlar) + nötr hipotez satırı.
- **Sahte adres barı** (`https://…`, kilit ikonu) gerçekçilik satar; url-param job'ında (`?q=`/`?id=`)
  enjeksiyon noktasının form değil URL olduğunu da öğretir (vision §4).
- **visibleSchema pedagojisi:** Front Door/Vault'ta ilgili tablolar listelenir; **Blueprint'te loot
  tablosu GİZLİ** → oyuncu `sqlite_master` keşfine mecbur (locked-contract §D, 01 §8.3).
- **Mobil:** tarayıcı çerçevesi üstte, Recon Notes altında collapsible ("Recon notes ▾").

**State'ler:** hover'da mimik alanların üzerinde "injectable?" mikro-vurgu (brass hairline); Recon Notes
boş değil (her zaman en az visibleSchema var). CTA "Move in →" → Exploit.

---

## 5. Ekran 3 — EXPLOIT (OYUNUN KALBİ)

**Kullanıcı amacı:** Payload yaz → oluşan gerçek SQL'i CANLI gör → çalıştır → sonucu/hatayı oku →
düzelt (döngü-içi döngü, planner §2.3). Zamanın ~%80'i burada geçer; en yüksek tasarım özeni burada.

### 5.1 Mental model = mekânsal metafor: "THE FRONT" ↔ "THE WIRE"

Split-screen, ama keyfi değil — **iki yüzey iki gerçeği temsil eder** (pedagoji):

- **SOL = THE FRONT** — kurbanın gördüğü sıradan uygulama (login/arama). Oyuncu buraya "normal" input
  yazar gibi payload yazar.
- **SAĞ = THE WIRE** — crew hattı tapmıştır; input'un DB'ye çarpan **ham SQL**'i + sonucu burada görünür.

Bu ayrım "front of house vs back of house" mental modelini kurar: *önden masum görünen input, arkada
sorgu yapısını kırıyor.* Ders, layout'un kendisinde.

```
┌──────────────────────────── EXPLOIT ─────────────────────────────────────────┐
│  THE FRONT (mimik hedef)          │  THE WIRE (tap — şeffaf SQL + sonuç)       │
│ ┌───────────────────────────────┐ │ ┌────────────────────────────────────────┐│
│ │ lock: acmecorp-admin/login       │ │ │ COMPOSED SQL  ● live                    ││
│ │                               │ │ │ ┌────────────────────────────────────┐ ││
│ │ Username                      │ │ │ │ SELECT id, username, role           │ ││ ← static = ink-300
│ │ ┌───────────────────────────┐ │ │ │ │ FROM users WHERE username =         │ ││   keyword = steel
│ │ │' OR '1'='1' --            │◀┼─┼─┼─│ '⟦' OR '1'='1' --⟧'                 │ ││ ← INJECTED = crimson
│ │ └───────────────────────────┘ │ │ │ │ ' AND password = '⟦x⟧'              │ ││   band + tokens
│ │ (mono, auto-grow)             │ │ │ │ ─────────────────────────────────── │ ││ ← --' sonrası: DIM,
│ │ Password                      │ │ │ │ // (yorumlandı, çalışmaz)           │ ││   italik, strike
│ │ ┌───────────────────────────┐ │ │ │ └────────────────────────────────────┘ ││
│ │ │x                          │ │ │ │  [ ⌘⏎  INJECT / RUN ]  (brass)  [Reset]  ││
│ │ └───────────────────────────┘ │ │ ├────────────────────────────────────────┤│
│ │                               │ │ │ RESULT                                   ││
│ │ [Handler intel ▾ 3]           │ │ │ ┌ id │ username │ role ───────────────┐ ││ ← ResultGrid
│ │  (ipucu tray, kilitli 3 slot) │ │ │ │ 1  │ admin    │ admin  ◀ loot        │ ││   loot satırı vurgulu
│ └───────────────────────────────┘ │ └────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 ŞEFFAF SQL gösterimi — `<SqlPreview>` (öğretici kalp, en kritik component)

Panel **her zaman görünür** (locked-contract §E). Oyuncu form alanına yazdıkça compose edilen GERÇEK
SQL **canlı** güncellenir (her keystroke; animasyon YOK — anlık "canlı hat" hissi; §01 akış).

**Katmanlı görsel kodlama (üst üste, pedagojik):**
1. **STATIC template segmentleri** (sunucunun yazdığı iskelet): nötr `--text-secondary` (ink-300);
   üstüne SQL syntax highlight (keyword=steel, string='sand', number). "Bu, sistemin kodu."
2. **INJECTED segmentleri** (oyuncunun her `{{input:field}}` yerine yazdığı ham metin): **crimson
   arka-plan bandı** (`--injected-bg`) + `⟦ … ⟧` break-out işaretçileri + crimson metin. İçindeki
   token'lar YİNE syntax-highlight'lanır → oyuncu görür: *"benim verim, motor tarafından SQL olarak
   okunuyor."* Çift kodlama = aha anı.
3. **Comment kuyruğu** (`--`, `/* */` sonrası): `--sql-comment` (dim + italik + %60 opacity + üstü
   ince strike). Oyuncu `AND password = '…'` kısmının **yorumlanıp çalışmadığını** GÖZLE görür → auth
   bypass dersinin görsel kanıtı.

**Segment kaynağı (frontend-dev'e contract notu — tahmin YOK):** injected↔static ayrımı REGEX ile
tahmin edilmez. `QueryComposer` zaten `template + inputs + sql` biliyor (01 §3.2 `ComposedQuery`).
`<SqlPreview>` segment offset'lerini composer çıktısından türetir (template'i yürürken her token'ın
başlangıç/bitiş offset'ini işaretle). Öneri: `ComposedQuery`'ye opsiyonel `segments: {kind:'static'|'injected', field?, text}[]` alanı eklensin (architect ile küçük uzlaşı) — böylece renklendirme **motor-doğru** olur, kırılmaz. Comment-dim ise hafif bir SQL tokenizer işi (yalnız görsel).

**Ligature OFF** (§1.4) — `--` iki tire olarak net görünür. **XSS (01 §9-R1):** tüm segment metni
React text-escape ile basılır; `dangerouslySetInnerHTML` YASAK (injected string `<img onerror>` içerebilir).

### 5.3 Input yüzeyi UX'i (DONMUŞ: mimik form-field + canlı preview)

- **Mimik ama güçlü alan:** `target.surface`'e göre login-form / search-box / url-param render edilir
  (`<ExploitConsole>` içinde `<MimicSurface>` varyantları). Alan görünüşte normal (login input),
  ama **monospace + otomatik-büyüyen** (textarea-vari, 01 §6.2) → `UNION SELECT NULL,NULL,…` ve
  `sqlite_master` gibi uzun payload'lar sıkışmadan sığar. Serbest SQL konsolu YOK (v1).
- **Label placeholder DEĞİL** (named rule + a11y): "Username" görünür `<label>`; placeholder yalnız ipucu.
- **Çoklu alan:** login = `username` + `password` (ikisi de injectable, template token'larıyla eşleşir).
  Arama = tek `q`. Her alan `target.fields[].name` ile birebir.
- **Çalıştırma:** birincil buton "INJECT / RUN" (brass); klavye `⌘/Ctrl+Enter`. `[Reset]` = taze DB
  (planner §2.6 — her Run zaten taze DB; Reset input+session temizler).
- **Focus:** brass `outline` ring (box-shadow değil — a11y), her alanda görünür.

### 5.4 Sonuç & feedback — `<ResultGrid>`

| Durum | Görünüm | Ton |
|-------|---------|-----|
| **empty (Run öncesi)** | THE WIRE'da SQL preview boş string literal'lerle (`''`) dolu; RESULT alanı "no run yet" iskeleti | nötr |
| **loading (Run)** | INJECT butonu spinner + disabled; grid skeleton-shimmer. 300ms altı gecikmede loader GÖSTERME (named rule) | — |
| **success (win)** | loot satır(lar)ı jade-tint + `◀ loot` etiketi; kısa "SECURED" flaş → Loot fazına geçiş | jade |
| **valid ama yanlış** | grid dolu/boş, nötr nudge: "Sorgu çalıştı — bu satırlarda loot yok." | teşvik, azarlamayan (§02 §10) |
| **SQLite error** | kırmızı "ERROR READOUT": SQLite mesajı **birebir** (mono) + dostça in-world gloss | bilgilendirici, hata=öğretici |
| **milestone** | steel-blue toast (z-100, 3–5s): "Kolon sayısı: 3 — şimdi veriyi çek." / "Şema açığa çıktı." | momentum |

- **Loot vurgusu:** `flag-in-result` kazanırken flag'i içeren hücre parlar; `row-match`'te eşleşen satır.
- **Grid:** `<table>` semantiği (a11y — kolon başlıkları `<th scope=col>`); yatay scroll dar ekranda.

### 5.5 İpucu — `<HintTray>` "Handler intel" (planner §7)

```
Handler intel                       ┌ Tier 1 · Nudge      −50  x ┐
[▾ aç]  3 kilitli slot              │ Tier 2 · Technique  −150 x │  ← sıralı: 1 açılmadan 2 açılmaz
soft-nudge: N fail sonrası          └ Tier 3 · Near-sol   −300 x ┘
"Takıldın mı? Handler'da intel var" tıkla → maliyet göster → onayla (modal z-50) → aç → metin belirir
```
- 3 kilitli slot; tıkla → maliyet (`hintCosts [50,150,300]`) onay modalı → aç. **Sıralı açılım** (1→2→3).
- **Soft-trigger:** N başarısız Run (öneri 5) sonrası tier-1 NAZİKÇE önerilir, otomatik AÇMAZ (agency).
- Açılan intel steel-tint kartta (nötr info), markdown; tier-3 payload mono.

### 5.6 Exploit — mobil (kritik: SQL her an görünür kalmalı)

Split dikey stack'e döner. **Sorun:** klavye açıkken oyuncu yazarken oluşan SQL'i görememeli DEĞİL.
**Çözüm — "SQL peek" sticky bar:**
```
┌─────────────────────────┐
│ lock: target/login         │  THE FRONT (üst)
│ Username [__________]   │  ← alan focus'ta
│ ...                     │
├─────────────────────────┤
│ ▓ COMPOSED SQL   [tam ▸]│  ← STICKY peek (klavye üstünde sabit): son 2 satır + injected vurgulu
├─────────────────────────┤  ← altta [INJECT/RUN] + RESULT (scroll)
```
- Yazarken alt-sabit "SQL peek" bar compose'u canlı gösterir (injected crimson); "[tam ▸]" tam paneli açar.
- INJECT butonu klavye üstünde erişilebilir; RESULT peek'in altında.
- Tüm dokunma hedefleri **min 44×44pt** (named rule). 320px'te kırılma yok.

---

## 6. Ekran 4 — LOOT ("Loot secured")

**Kullanıcı amacı:** Katarsis + skor kırılımı + zorunlu Debrief köprüsü (planner §2.4). Gerilim boşalır.

**Layout — merkezî "score/haul" kartı (bu tek ekran merkezlenebilir — an = odak):**
```
┌───────────────────────────────────────────────────┐
│              ╱  LOOT SECURED  ╲   (jade, Display)  │  ← stamp anı
│                                                     │
│   Kazanan payload:  ' OR '1'='1' --   (mono)        │  ← hangi payload kazandı (pekiştirme)
│   ┌─ extracted ──────────────────────────────────┐ │
│   │ 1 │ admin │ admin      ◀ loot (jade-tint)     │ │  ← çıkarılan satır/flag vurgulu
│   └───────────────────────────────────────────────┘ │
│                                                     │
│   PAYOUT ▓▓▓▓        SCORE  850                      │
│   ┌ base 1000  − attempts 100  − hints 50  ─────┐   │  ← <ScoreBreakdown> şeffaf kırılım
│   │ + time bonus 0                             │   │
│   └────────────────────────────────────────────┘   │
│              ★ ★ ☆   "dağınık ama oldu"             │  ← yıldız (900/600/tamamla, §02 §6.3)
│                                                     │
│                         [ Debrief → ] (brass)       │  ← zorunlu sonraki (loot debrief'siz kapanmaz)
└───────────────────────────────────────────────────┘
```
- **`<LootBanner>` + `<ScoreBreakdown>`:** "SECURED" stamp; kazanan payload + çıkarılan loot echo'su;
  skor kırılımı (base − attempts − hints + timeBonus, planner §6.2) şeffaf; yıldız.
- **Mood:** lamba parlar; jade/brass restrained kutlama — **konfeti YOK** (noir restraint). Kasa-mandalı
  / stamp mikro-animasyonu (spring, <300ms). Skor count-up (reduced-motion'da anında).
- **CTA:** yalnız "Debrief →" — loot debrief olmadan kapanmaz (vision §1 savunma zorunlu).
- **Mobil:** dikey stack, kart full-width, CTA sticky-bottom.

**State'ler:** skor count-up (skippable) · yıldız stagger fill (30–50ms named rule) · reduced-motion=anında.

---

## 7. Ekran 5 — DEBRIEF ("Saldırı → Savunma") — ZORUNLU

**Kullanıcı amacı:** Exploit'i root-cause + parametreli fix'e bağla — oyunun EĞİTİM ödülü (planner §9).
Rehberli, sıralı açılan **beat**'ler; merkez = **vuln ↔ secure kod YAN YANA**.

### 7.1 Beat akışı (progressive disclosure — metin duvarı değil)

Beat'ler sırayla açılır (planner §9.1); her beat oyuncunun **KENDİ** kazanan payload'ına demirli:
```
① THE MOVE          → kazanan payload + oluşan gerçek SQL tekrar (Exploit'ten taşınır)
② WHY IT WORKED     → enjeksiyon noktası vurgulu; input'un veri→kod nerede taştığı işaretli
③ THE FIX           → vuln ↔ secure kod YAN YANA (aşağıdaki layout) + diff vurgu
④ WHY THE FIX CLOSES IT → parametre kodu veriden ayırır; oyuncunun payload'ı artık zararsız string
⑤ TAKEAWAY          → tek satır mnemonik ("Konkatlamayı bırak. Bind et.") + "defense card"
```

### 7.2 Kod karşılaştırma layout'u — `<CodeCompare>` (beat ③, en kritik görünüm)

**Desktop = iki kolon yan yana** (kontrast görsel; renk YASASINA + ikon/etikete uyar):
```
┌─ ✗ VULNERABLE ────────────────┐   ┌─ ✓ SECURE ─────────────────────┐
│ (crimson başlık + kırık-kilit) │   │ (jade başlık + kilit ikonu)     │
│ ┌──────────────────────────┐   │   │ ┌───────────────────────────┐   │
│ 1│ q = "SELECT * FROM users │◀──┼───┼─│1│ q = "SELECT * FROM users  │   │  ← aynı satırlar hizalı
│ 2│  WHERE name = '" + input │ ● │   │ │2│  WHERE name = ?"          │ ● │  ← diff satırı gutter'da
│  │              ▔▔▔▔▔▔▔▔▔▔▔▔ │   │   │ │ │              ▔▔▔        │   │    işaretli (● = değişen)
│ 3│  + "'"                   │   │   │ │3│ db.run(q, [input])        │   │
│ └──────────────────────────┘   │   │ └───────────────────────────┘   │
│ crimson-tint bg, sql-highlight │   │ jade-tint bg, sql-highlight     │
└────────────────────────────────┘   └─────────────────────────────────┘
   ↑ concat (input → kod)                ↑ bound parameter (input → veri)
```
- İki panel; başlıklar **ikon+etiket+renk** (renk-tek-başına DEĞİL — a11y). Değişen satırlar gutter'da
  `●` + kısa alt-çizgi ile işaretli (diff). İçerik `vulnerableCode`/`secureCode` alanlarından (01 §4;
  doğruluk security-analyst 03). Kod salt-okunur, mono, çalıştırılmaz.
- **Concat→bind vurgusu:** vuln'de `'" + input + "'` crimson alt-çizgi (tehlike); secure'de `?` +
  `[input]` jade alt-çizgi (savunma) → göz farkı yakalar.

**Mobil = dikey stack (tab DEĞİL):** VULNERABLE üstte, SECURE altta; başlıklar renkli+ikonlu; diff
satırları hizalı. Tab kullanmıyoruz çünkü **kontrast dersi iki kodu AYNI ANDA görmeyi gerektirir**
(tab birini gizler). Dar ekranda kod yatay scroll; satır numaraları sabit.

### 7.3 Debrief — diğer state'ler
- **İlk tamamlama:** debrief tam/öncelikli (öğrenme atlanamaz). **Replay:** beat'ler collapse edilebilir.
- **CTA:** "Next job → (unlock)" (jade) veya "Run it back" (skor iyileştir, brass-ghost).
- `aria-live` beat açılışları duyurulur; kod bloklarında `role` + dil etiketi.

---

## 8. Destek ekran — JOB BOARD / CREW HQ (hub)

Route `jobs/page.tsx` (01 §1.1). 3 job kartı + kilit/yıldız/skor (planner §8). Çekirdek 5 ekranın dışı
ama gerekli. **Generic 3-eşit-kart satırı YASAK (anti-slop)** → asimetrik "board" + durum farkı:
```
┌──────────────────── THE CREW · JOBS ───────────────────────┐
│ ┌─ 01 FRONT DOOR ─┐  ┌─ 02 THE VAULT ─┐  ┌─ 03 BLUEPRINT ─┐ │
│ │ ✓ ★★★  850      │  │ ▷ oyna  —      │  │ [locked]      │ │  ← tamam / aktif / kilitli 3 durum
│ │ auth-bypass     │  │ union-extract  │  │ (Vault'u bitir)│ │
│ │ [Run it back]   │  │ [ Take job → ] │  │                │ │
│ └─────────────────┘  └────────────────┘  └────────────────┘ │
│ Rank: "Pro"   Σ score ▓▓▓                                   │  ← toplam rütbe (kozmetik, §02)
└─────────────────────────────────────────────────────────────┘
```
- `<JobCard>` state'leri: **completed** (jade check + yıldız + skor + "Run it back"), **active**
  (brass "Take job"), **locked** (muted + kilit + "önce X'i bitir"). Doğrusal unlock (planner §8).
- Mobil: kartlar tek kolon dikey stack; aktif kart brass hairline ile öne çıkar.

---

## 9. Component envanteri (architecture §1.2 ile 1:1 + UI primitifleri)

**Architect'in kanonik client component'leri (01 §1.2) — bu doküman UX'ini verir:**

| Component | Faz | UX sorumluluğu (bu doküman) |
|-----------|-----|------------------------------|
| `<JobPlayer level>` | tümü | Orkestratör; kabuk + faz geçiş (`AnimatePresence`) |
| `<BriefPanel>` | brief | §3 dossier; HandlerCard + hedef künyesi + CTA |
| `<ReconPanel>` | recon | §4 BrowserChrome mimik app (pasif) + ReconNotes(visibleSchema) |
| `<ExploitConsole>` | exploit | §5 split THE FRONT/THE WIRE; MimicSurface + input yüzeyi |
| `<SqlPreview>` | exploit | §5.2 ŞEFFAF SQL — static/injected/comment katmanlı kodlama |
| `<ResultGrid>` | exploit | §5.4 sonuç tablosu / error readout / loot vurgu |
| `<LootBanner>` | loot | §6 SECURED + kazanan payload + loot echo |
| `<DebriefPanel>` | debrief | §7 beat akışı + CodeCompare |
| `<HintTray>` | exploit | §5.5 Handler intel, 3 kilitli slot, sıralı |

**Bu dokümanın eklediği UI primitifleri / alt-component'ler (frontend-dev build haritası):**

| Primitif | Kullanım | Not |
|----------|----------|-----|
| `<TopBar>` + `<PhaseStepper>` | global kabuk | 5-adım stepper, timer, skor, ses |
| `<MimicSurface>` (login/search/url-param varyant) | Recon + Exploit | `target.surface` sürer; auto-grow mono input |
| `<BrowserChrome>` | Recon (+Exploit sol) | sahte adres barı + kilit; url-param injection noktası |
| `<HandlerCard>` | Brief | codename + siluet + konuşma metni |
| `<ScoreBreakdown>` | Loot | base/attempts/hints/timeBonus şeffaf kırılım + yıldız |
| `<CodeCompare>` | Debrief | vuln↔secure iki-kolon (mobilde stack) + diff gutter |
| `<JobCard>` | Job Board | completed/active/locked state'leri |
| `<EngineLoader>` | Brief→Exploit | WASM `loading/ready/error` + retry (01 §2.1 R3) |
| `<Toast>` | Exploit | milestone/hata bildirimi, z-100, 3–5s |
| primitifler: `<Button>` `<Field>` `<Panel>` `<Stamp>` | tümü | brass/ghost/danger varyant; tüm state'ler §10 |

---

## 10. State matrisi (her interaktif component — "state'siz component bitmez")

| Component | default | hover | active/focus | disabled | error | loading | empty |
|-----------|---------|-------|--------------|----------|-------|---------|-------|
| Button (primary) | brass fill | brass-500 | scale-[.98] + ring | opacity-50 + not-allowed | — | spinner + disabled | — |
| Input (mimik) | border noir-700 | border-strong | brass ring | opacity-50 | crimson border + alt-mesaj | — | placeholder (≠label) |
| SqlPreview | canlı SQL | — | — | — | (SQL geçerli, hata RESULT'ta) | anlık (animasyon yok) | boş string literal `''` |
| ResultGrid | satır tablosu | satır hover tint | satır focus | — | ERROR READOUT (crimson, birebir) | skeleton-shimmer (>300ms) | "no run yet" iskeleti |
| HintTray slot | kilitli + maliyet | brass hover | onay modal (z-50) | tier sırası kapalıysa muted | — | — | 3 slot her zaman görünür |
| JobCard | duruma göre | lift 2px | ring | locked=muted | — | — | — |

Loading/empty/error/success/disabled TÜM interaktifte tasarlandı (pre-delivery checklist).

---

## 11. Erişilebilirlik (WCAG AA — checklist)

- **Kontrast:** off-white/ink-300 metin ≥4.5:1; brass/crimson/jade/steel metin dark üstünde ≥4.5:1
  (büyük/UI ≥3:1). Injected-token crimson, kendi crimson-tint bandına karşı ≥4.5:1 **doğrulanacak**
  (implementasyonda ölç, tahmin etme).
- **Renk tek başına DEĞİL (1.4.1):** attack/defense her yerde **ikon + etiket + konum** ile pekişir
  (Debrief VULNERABLE/SECURE; injected segment alt-çizgi + `⟦⟧`; loot `◀ loot` etiketi). Kırmızı/yeşil
  körlüğü bu sayede engellenmez.
- **Klavye:** tam Tab sırası; `⌘/Ctrl+Enter` = Run; `Esc` = hint modal kapat; stepper/CTA erişilebilir.
- **Focus:** görünür brass `outline` ring (box-shadow değil), her interaktif elemanda.
- **Screen reader:** ResultGrid gerçek `<table>` + `<th scope>`; SqlPreview değişimi `aria-live="polite"`
  (composed SQL okunur); win/error `aria-live` duyurusu; hint modal `role=dialog aria-modal`.
- **Touch target:** tüm tıklanabilir ≥44×44pt (named rule).
- **Reduced motion:** `prefers-reduced-motion` → typewriter/count-up/stagger anında; grain/vignette kapanır.
- **Alt text:** handler siluet dekoratif → `alt=""`; anlamlı görsel → tanımlı alt.
- **Placeholder ≠ label:** her alanda görünür `<label>`.

---

## 12. Responsive

| Breakpoint | Davranış |
|-----------|----------|
| **base (mobil, ≥320px)** | tek kolon; Exploit dikey stack + "SQL peek" sticky bar (§5.6); CTA sticky-bottom; kod yatay scroll |
| **sm 640** | Brief/Recon iki-blok; body 16px sabit |
| **lg 1024** | Exploit **split-screen** THE FRONT/THE WIRE; Debrief CodeCompare **yan yana**; Job Board 3-kart board |
| **xl 1280** | `max-w-[1200px]` içerik; daha ferah spacing (8/12/16) |

- **320px'te kırılma YOK** (checklist). Split → stack `lg` altında.
- **Kritik mobil kural:** Exploit'te oluşan SQL klavye açıkken sticky peek ile GÖRÜNÜR kalır (§5.6) —
  şeffaflık dersi mobilde de bozulmaz.

---

## 13. Motion & feedback (named rules)

| Olay | Süre | Araç / not |
|------|------|-----------|
| Hover/toggle (micro) | 100–150ms | CSS transition (transform/opacity — GPU only) |
| Faz geçişi, modal, toast (standard) | 150–300ms | Framer `AnimatePresence`; cubic-bezier(.16,1,.3,1) |
| Liste/yıldız stagger | 30–50ms/item | Framer `staggerChildren` |
| Loot stamp / kasa mandalı | ~250ms spring | stiffness 300 damping 30; reduced-motion=anında |
| **SqlPreview güncelleme** | **0ms (anlık)** | canlı hat hissi — SQL text animasyonlanMAZ; yalnız injected band'de çok kısa (~120ms) crimson flaş |
| Loading göster eşiği | 300ms sonra | named rule: loading-delay (kısa Run'da spinner yanıp sönmesin) |
| Toast süresi | 3–5s bilgi, kalıcı hata | named rule: toast-duration |
| Result/loot reveal | 200–300ms | fade+slide; loot satırı jade-tint pulse (1x, seizure-safe <3/s) |

- **GPU-only:** yalnız transform/opacity/filter/clip-path animasyonlanır (width/top/margin YASAK).
- **Perpetual animasyon:** yalnız gerekliyse (TopBar canlı nokta) `React.memo` leaf'te; genelde YOK (noir sakinliği).
- **prefers-reduced-motion:** tüm giriş/stagger/count-up/flaş kapanır → anlık state.

---

## 14. Pre-Delivery UX Checklist (implementasyon fazı kapısı)

- [ ] Kontrast AA (4.5:1) — dark palette tüm metin/aksan doğrulandı (ölç)
- [ ] Touch target ≥44×44pt
- [ ] Tüm state'ler: loading/empty/error/success/disabled (§10)
- [ ] Klavye nav + `⌘/Ctrl+Enter` Run + `Esc` modal
- [ ] `prefers-reduced-motion` destekli
- [ ] 320px'te kırılma yok; Exploit mobil "SQL peek" görünür
- [ ] Body min 16px mobil
- [ ] Form: login 2 alan (≤7/step named rule — rahat)
- [ ] Focus indicator görünür (brass outline)
- [ ] 4px/8px grid tutarlı
- [ ] Dark token'ları semantic katmandan (primitive'e direkt referans yok)
- [ ] Alt text; placeholder ≠ label
- [ ] Standard animasyon <300ms
- [ ] z-index scale: dropdown 10 / modal 50 / toast 100
- [ ] **Şeffaf-SQL:** injected=crimson band, static=nötr, comment=dim-strike; ligature OFF; segment
      motor-doğru (composer'dan, regex tahmini yok); `dangerouslySetInnerHTML` YASAK (XSS)
- [ ] Renk tek başına bilgi taşımıyor (attack/defense ikon+etiket+konum)

---

## 15. Gate-2 downstream / açık uzlaşılar

- **architect (01):** `ComposedQuery`'ye opsiyonel `segments[]` (static/injected offset) eklenmesi
  önerilir → `<SqlPreview>` motor-doğru renklendirir (§5.2). Küçük, geriye-uyumlu; architect onayına tabi.
- **copywriter (06):** panel stamp'leri (CASE FILE / THE WIRE / SECURED), handler sesi, in-world
  gloss (hata/milestone/loot), rütbe adları, buton copy.
- **security-analyst (03):** `<CodeCompare>` vuln↔secure içerik doğruluğu; injected/comment örnek payload'lar.
- **data-modeler (05):** `visibleSchema` (Recon Notes) + loot satır/flag (ResultGrid vurgusu) hizası;
  Blueprint loot tablosu `visibleSchema`'da GİZLİ.
- **frontend-dev (impl):** §9 component haritası + §10 state matrisi build sözleşmesi; framer-motion
  (UI) — GSAP gereksiz (bu MVP sinematik-hafif). Animasyon-patterns + design-to-code skill'leri.

## Değişiklik günlüğü
| Sürüm | Tarih | Değişiklik |
|-------|-------|-----------|
| v0.1 | 2026-07-29 | İlk taslak (Gate 2 designer). Noir dark-first tema + semantik renk yasası, 3-katman token, 5 çekirdek ekran + Job Board, şeffaf-SQL katmanlı kodlama, input yüzeyi UX, component envanteri (01 §1.2 1:1), state matrisi, a11y/responsive/motion, checklist. |
