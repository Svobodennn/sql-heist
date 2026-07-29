# SQL Heist — Oyun Tasarımı Dokümanı (02)

> Gate 1 çıktısı (planner). `00-vision.md`'e dayanır; `01-architecture.md` (architect)
> ile ORTAK "level JSON şeması + engine kontratı" konusunda **architect kanoniktir**.
> Bu doküman o şemanın **game-design semantiğini** doldurur: win-condition değerleri,
> ipucu içerik yapısı, puanlama alanları. **Rakip şema tanımlamaz.**
> Statü: **TASLAK — parent kilitlemesi (LOCKED CONTRACT) bekliyor.**

## Sahiplik sınırı (bu dokümanın yetkisi)
- **Planner kanonik:** puanlama (scoring), ipucu (hint) modeli, loot/win-condition **semantiği**.
- **Architect kanonik:** level JSON şeması (alan adları + tipler), engine kontratı,
  win-condition DSL'inin **biçimi**, input yüzeyi kararı.
- Aşağıda şema alanlarına **kavramsal** adlarla atıf yapılır (`queryTemplate`, `winCondition`,
  `hints`, `vulnerableCode`, `secureCode`, `schema`, `seed`, `scoring` — vision §5).
  **Kesin adlar architect'te**; parent, replan checkpoint'te bu iki dokümanı uzlaştırıp
  tek bir LOCKED CONTRACT'a çevirecek.

---

## 1. Tasarım direkleri (oyuncu deneyimi ilkeleri)
1. **Önce öğrenme, sonra skor.** Skor motivasyon katmanıdır; ilerlemeyi ASLA bloklamaz.
   Öğrenmeyi caydıran hiçbir ceza koyulmaz (deneme serbestçe yapılabilir).
2. **Şeffaf SQL.** Oyuncu yazdıkça, input'undan oluşan **gerçek SQL** canlı görünür.
   Kandırma yok — "neden çalıştı" görülebilir (vision §1).
3. **Fail-safe sandbox.** Kalıcı kaybetme yok. Her `Run` taze DB'ye karşı çalışır
   (vision §5); state bozulamaz, oyuncu sonsuz deneyebilir.
4. **Agency (oyuncu kontrolü).** İpuçları talep üzerine açılır, dayatılmaz. Oyuncu ne
   zaman yardım alacağına kendi karar verir.
5. **Saldırı → savunma zorunlu eşleşmesi.** Her job, exploit'in root-cause + parametreli
   fix debrief'i olmadan bitmez (vision §1, §10).

---

## 2. Çekirdek döngü mekaniği (Brief → Recon → Exploit → Loot → Debrief)

Döngü tek bir job'ın yaşam çevrimidir. Her adım, level JSON'daki ilgili kavramsal alanı okur.

### 2.1 Brief — "İş geliyor"
- **Oyuncu deneyimi:** Handler (fixer) noir tonda işi anlatır: hedef sistem, aranan **loot**,
  ima edilen giriş noktası ("ön kapı onların login'i"). Gerilim + motivasyon kurulur.
- **Oyuncu aksiyonu:** Brief'i oku → **"İşi al / Keşfe geç"** butonu.
- **Okuduğu veri:** in-world brief metni (copywriter, `06`), job hedefi/loot adı.
- **Amaç:** Tekniği **spoil etmeden** kategoriyi telegraf et; win-condition'ı in-world diliyle
  ("admin erişimi al", "kasadaki hesapları çek", "planları indir") oyuncuya duyur.
- **Telemetri:** Job oturumu başlar (ama **süre sayacı Exploit'te başlar** — brief okuması
  cezalandırılmaz).

### 2.2 Recon — "Hedefi keşfet"
- **Oyuncu deneyimi:** Sahte hedef web app'i inceler (stilize ama gerçekçi). Giriş yüzeyini
  (login formu / arama kutusu / URL param) tanır, hipotez kurar: "burada bir sorgu var, deneyeyim".
- **Oyuncu aksiyonu:** Yüzeyi incele; opsiyonel "recon notları" paneli (bilinen endpoint/alanlar).
- **Okuduğu veri:** recon yüzeyi tanımı (input surface — architect kararı), görünür alanlar.
- **Amaç:** Enjeksiyon noktasını **kendi** bulmasını sağla. Query template'in ham hali burada
  **gösterilmez** (aksi halde bulmaca çözülür); şeffaf SQL, Exploit'te input'la birlikte belirir.
- **Geçiş:** "Saldırıya geç" → Exploit.

### 2.3 Exploit — "Payload yaz, SQL'i gör, çalıştır"  *(oyunun kalbi)*
- **Oyuncu deneyimi:** Input alanına payload yazar. **Canlı SQL paneli**, template + input'un
  birleşiminden oluşan gerçek SQL'i yazdıkça günceller. `Run/Inject` → engine taze SQLite DB'ye
  karşı çalıştırır → sonuç grid'i veya SQLite hata mesajı döner. Oyuncu iterasyon yapar:
  yaz → SQL'i gör → çalıştır → sonucu oku → düzelt. (Döngü-içi döngü.)
- **Oyuncu aksiyonu:** payload yaz, `Run`, sonucu incele, tekrar dene; isterse **ipucu aç**.
- **Okuduğu veri:** `queryTemplate` (enjeksiyon noktalı), `schema`+`seed` (taze DB),
  `winCondition` (her Run sonrası değerlendirilir), `hints` (talep üzerine).
- **Amaç:** Deneysel öğrenme. Hata mesajı da öğreticidir (error-based tekniğin habercisi).
- **Telemetri (puanlama girdisi):** **süre sayacı burada başlar**; her kazanamayan `Run` bir
  *başarısız deneme* sayılır; açılan ipucu tier'ı kaydedilir.

### 2.4 Loot — "Kazanç"
- **Oyuncu deneyimi:** win-condition sağlanınca "LOOT SECURED" anı — gerilim boşalır, kazanç
  görünür (çıkarılan satır/flag vurgulanır). Ödül (payout) + skor kırılımı (deneme/süre/ipucu →
  puan) + yıldız gösterilir.
- **Oyuncu aksiyonu:** kazancı gör → **"Debrief"** butonu.
- **Okuduğu veri:** kazanan SQL + sonuç satırları (oyuncunun kendi çalıştırması), skor alanları
  (`scoring`, §6).
- **Amaç:** Başarıyı somut kıl (hangi payload kazandı) ve öğrenme anına (Debrief) köprü kur.
  Loot, **debrief'siz** kapanmaz.

### 2.5 Debrief — "Saldırı → Savunma" *(zorunlu)*
- **Oyuncu deneyimi:** Adım adım rehberli açılım: ne yaptın → neden çalıştı → nasıl kapatılır →
  neden kapatır → akılda kalan kural. (Detaylı akış §9.)
- **Oyuncu aksiyonu:** beat'leri sırayla ilerlet; sonunda **"Sonraki iş"** (unlock) veya
  **"Tekrar dene"** (skor iyileştir).
- **Okuduğu veri:** `vulnerableCode`, `secureCode`, "neden çalıştı/neden fix kapatır" açıklaması
  (içerik doğruluğu security-analyst `03`); oyuncunun kazanan payload'ı (referans için).
- **Amaç:** Exploit'i root-cause + parametreli savunmaya bağla (vision §1). Bu, oyunun eğitim ödülü.

### 2.6 Döngü durum diyagramı
```
Brief ──▶ Recon ──▶ Exploit ◀─┐
                       │        │ (kazanamayan Run / ipucu → tekrar)
                       ▼        │
                     (win?) ─no─┘
                       │yes
                       ▼
                     Loot ──▶ Debrief ──▶ [Sonraki job unlock] / [Replay]
```
- **Süre:** Exploit girişinde başlar, ilk win'de durur (Loot). Replay'de sıfırdan sayılır.
- **Deneme/ipucu:** yalnızca Exploit'te birikir; Loot/Debrief cezasız.
- **Taze DB garantisi:** her `Run` şema+seed'i yeniden yükler → önceki denemeler state kirletemez.

---

## 3. Per-job design skeleton (PARENT BUNU KİLİTLEYECEK)

Bu tablo, LOCKED CONTRACT'ın game-design çekirdeğidir. `technique + loot + win-condition
semantiği` planner-kanonik; `recon surface + column count` parent'ın kilitleyeceği öneridir;
`hedef DB şekli` data-modeler (`05`) tarafından, win-condition **biçimi** architect (`01`)
tarafından doldurulacak.

| # | Job | Teknik (müfredat) | Recon yüzeyi | Loot (kavram) | Win-condition **semantiği** | Görünür kolon sayısı (öneri) |
|---|-----|-------------------|--------------|---------------|------------------------------|------------------------------|
| 1 | **The Front Door** | Tautology + comment auth bypass (T1–2) | Login formu (username + password) | Admin/hedef kimlikle **kimlik doğrulanmış erişim** | Login sorgusu, password predikatı bypass edilerek **admin/hedef satırı içeren** bir sonuç kümesi döndürür → `result-contains-privileged-row` | 1 (bypass; kolon sayısı gerekmez) |
| 2 | **The Vault** | Kolon sayısı bulma + UNION extraction (T3–4) | Arama kutusu (sonuçları yansıtan SELECT) | Gizli, **adı bilinen** tablodan sızdırılan hesap/müşteri verisi | Sonuç kümesi, **yalnızca loot tablosunda** bulunan seed'li bir gizli değeri içerir → `result-contains-value(X)` | **3** (kilitlenecek; `05` seed ile uyumlu) |
| 3 | **The Blueprint** | `sqlite_master` şema keşfi → UNION extract (T5) | Arama / URL param (yansıtan SELECT) | Adı **bilinmeyen** gizli tablodan çıkarılan "blueprint" dokümanı | Sonuç kümesi, oyuncunun `sqlite_master` ile **keşfetmek zorunda kaldığı** tablodaki seed'li blueprint flag'ini içerir → `result-contains-value(Y)` | **2** (öneri: Vault'tan farklı → kolon-sayısı becerisini tekrar ettirir) |

**Win-condition DSL gereksinimi (architect'e):** yukarıdaki semantik iki assertion primitifi
gerektirir — (a) **row-match**: sonuç kümesinde bir predikatı (ör. `is_admin = 1`) sağlayan satır
var mı; (b) **value-contains**: sonuç kümesinin herhangi bir hücresinde seed'li bir gizli değer
geçiyor mu. DSL'in **biçimi** architect'e ait; planner yalnızca bu iki semantiği **talep eder**.
Değerlerin (predikat alanı, gizli flag string) kendisi data-modeler (`05`) seed'iyle hizalanır.

---

## 4. Üç MVP job tasarımı (detay)

### 4.1 Job 1 — "The Front Door" (Auth bypass · T1–2)
- **Öğrenme hedefi:** WHERE cümlesine string olarak konkatlanan input'un sorgu **mantığını**
  değiştirebileceğini kavratmak: tautology (`OR '1'='1'`) koşulu daima doğru yapar; `--` satırın
  kalanını (password kontrolü) yorum satırına çevirir.
- **Hedef teknik:** Tautology + comment ile authentication bypass.
- **Recon yüzeyi:** Login formu (username + password). Klasik giriş noktası; oyuncu username'e enjekte eder.
- **Query template (kavramsal şekil — kesin biçim `01`):**
  `SELECT * FROM users WHERE username = '<input>' AND password = '<input>'`
- **Beklenen payload örneği (SQLite; doğruluk `03`):**
  - `admin' --` → password kontrolü yorumlanır, admin olarak giriş.
  - `' OR '1'='1' --` → koşul daima doğru, satırlar döner (admin dahilse win).
- **Win-condition semantiği:** login sorgusu, **admin/hedef satırı içeren** sonuç döndürür
  (`result-contains-privileged-row`, predikat ör. `is_admin = 1`). İki payload da kazandırır (iki yol).
- **İpucu merdiveni (3 kademe):**
  1. *Kavramsal nudge:* "Form, yazdığını sorgunun içine olduğu gibi bırakıyor. Ya metnin sadece
     metin değilse? Bir tırnak, string'i erken bitirebilir."
  2. *Teknik + yöntem:* "İki fikir: koşulu hep doğru yap ya da sorguyu kısa kes. `OR` + hep-doğru
     bir şey; `--` satırın kalanını yok sayar."
  3. *Near-solution:* "username'e `admin' --` veya `' OR '1'='1' --` dene; `--` password kontrolünü yorumlar."
- **Zorluk:** Giriş seviyesi. Tek input, tek teknik, anında feedback. Canlı-SQL kavramını tanıtır.

### 4.2 Job 2 — "The Vault" (UNION extraction · T3–4)
- **Öğrenme hedefi:** `UNION SELECT` ile **başka bir tablodan** veriyi görünür sonuç kümesine
  taşıyabilirsin — ama ancak kolon sayısı ve tip hizası tutarsa. Önce kolon sayısını bul
  (`ORDER BY n` / `UNION SELECT NULL,...`), sonra çek.
- **Hedef teknik:** Kolon sayısı tespiti → UNION-based extraction.
- **Recon yüzeyi:** Arama kutusu — sonuçları oyuncuya **yansıtan** bir SELECT (UNION çıktısı görünür olmalı).
- **Query template (kavramsal şekil):**
  `SELECT id, name, price FROM products WHERE name LIKE '%<input>%'` *(3 görünür kolon)*
- **Beklenen payload örneği (SQLite; doğruluk `03`):**
  - *Adım A — kolon sayısı:* `' ORDER BY 3 -- ` çalışır, `' ORDER BY 4 -- ` hata → 3 kolon.
  - *Adım B — extraction:* `' UNION SELECT username, password, NULL FROM accounts -- ` (kolon sayısı 3 eşleşir).
  - **Tablo adı bu job'da BİLİNİR** (handler intel'i / recon verir) — bilinmeyen tablo keşfi Blueprint'in dersi.
- **Win-condition semantiği:** sonuç kümesi, **yalnızca loot tablosunda** var olan seed'li bir gizli
  değeri (ör. bilinen bir hesap no / "vault manifest" flag'i) içerir → `result-contains-value(X)`.
  Bu, UNION'ın gerçekten çapraz-tablo veri çektiğini (yalnız products değil) doğrular.
- **İpucu merdiveni:**
  1. *Nudge:* "Arama, eşleşen satırları sana geri yansıtıyor. İkinci bir sorguyu buna
     ekleyebilsen, onun satırları da aynı listede belirir. Ama üst üste iki SELECT **aynı şekle** (kolon sayısı) uymalı."
  2. *Teknik + yöntem:* "Önce kaç kolon döndüğünü bul: `ORDER BY 1`, `2`, `3`... kırılana kadar;
     çalışan son sayı senin kolon sayın. Sonra o kadar değerle `UNION SELECT`."
  3. *Near-solution:* "3 kolon. `' UNION SELECT username, password, NULL FROM accounts -- ` dene
     (tablo adı brief/recon'da verildi)."
- **Zorluk:** İki adımlı (recon: kolon sayısı → extract). UNION, kolon eşleme, NULL padding,
  çapraz-tablo. Front Door'dan belirgin şekilde zor.

### 4.3 Job 3 — "The Blueprint" (Şema keşfi · T5)
- **Öğrenme hedefi:** Tablo/kolon adlarını bilmediğinde, veritabanının kendi metadata'sı
  (`sqlite_master`) sana söyler. Şemayı sorgula → gizli tabloyu keşfet → loot'u çek.
- **Hedef teknik:** `sqlite_master` şema keşfi → hedefli UNION extraction (Vault'un UNION becerisi üstüne).
- **Recon yüzeyi:** Arama / URL param (`?q=` / `?id=`) — yansıtan SELECT. URL param seçilerek
  enjeksiyon noktalarının yalnızca formlar olmadığı da öğretilir (vision §4).
- **Query template (kavramsal şekil):** Vault'a benzer yansıtan SELECT; ancak loot tablosunun adı
  **bilinmez ve tahmin edilemez** (ör. `z_bp_registry_7f3a`). *(Öneri: görünür kolon sayısı 2 → Vault'tan
  farklı, kolon-sayısı recon'unu tekrar ettirir.)*
- **Beklenen payload örneği (SQLite; doğruluk `03`, kolon sayısı kilide bağlı):**
  - *Adım A — şema keşfi:* `' UNION SELECT name, sql FROM sqlite_master WHERE type='table' -- `
    → tablo adları + CREATE ifadeleri (kolonları da öğretir).
  - *Adım B — extraction:* keşfedilen tabloya UNION: `' UNION SELECT schematic_id, payload FROM z_bp_registry_7f3a -- `.
- **Win-condition semantiği:** sonuç kümesi, oyuncunun `sqlite_master` ile **keşfetmek zorunda
  kaldığı** tablodaki seed'li blueprint flag'ini (Y) içerir → `result-contains-value(Y)`. Win, **final
  extraction'da**; şema dökümü tek başına win değildir (aşağıda "ara ilerleme sinyali" olarak tanınır).
- **İpucu merdiveni:**
  1. *Nudge:* "UNION hilesi elinde ama planların hangi tabloda olduğunu bilmiyorsun — tahmin
     yürümez. Veritabanları kendi kataloğunu tutar; SQLite'ınki `sqlite_master`."
  2. *Teknik + yöntem:* "`sqlite_master`'a UNION at: `type='table'` iken `name` ve `sql` çek. `sql`
     alanı her tablonun kolonlarını gösterir — haritan bu."
  3. *Near-solution:* "Katalogdaki tuhaf isimli tabloyu bul, kolonlarını `sql` alanından oku, sonra
     ona UNION at: `' UNION SELECT <col1>, <col2> FROM <o tablo> -- `."
- **Zorluk:** MVP'nin en yükseği. Zincirleme gerektirir: kolon sayısı (Vault becerisi) + `sqlite_master`
  keşfi + hedefli extraction. Tahmin-edilemez tablo adı, Vault kısayolunu kapatıp keşfi zorunlu kılar.

---

## 5. Zorluk artışı (ramp) — özet
| Job | Adım sayısı | Yeni kavram | Önceki beceri tekrarı |
|-----|-------------|-------------|------------------------|
| Front Door | 1 | tautology, `--` comment, canlı SQL | — |
| The Vault | 2 | UNION, kolon sayısı, NULL padding, çapraz-tablo | (comment `--`) |
| The Blueprint | 3 | `sqlite_master`, şema-güdümlü keşif | UNION + kolon sayısı (farklı kolon sayısıyla tekrar) |

---

## 6. Puanlama formülü (planner-kanonik · vision §12)

**Tasarım hedefi:** verimliliği ödüllendir, ama deneyi/öğrenmeyi cezalandırma. Skor ikincil
motivasyon; ilerlemeyi asla bloklamaz. Negatif his (tırmanan ceza) yerine pozitif çerçeve (par-time bonusu).

### 6.1 Değişkenler (job başına)
| Değişken | Anlam | Öneri varsayılan |
|----------|-------|-------------------|
| `BASE` | Job taban puanı | 1000 |
| `freeAttempts` | Cezasız başarısız deneme sayısı (deney serbestliği) | 3 |
| `A` | `freeAttempts` üstü her başarısız deneme cezası | 50 |
| `hintCost[]` | Kademeli ipucu maliyeti [tier1, tier2, tier3] | [50, 150, 300] |
| `parTime` | Hedef bitiş süresi (bonus eşiği), job'a göre | Front Door 3dk · Vault 5dk · Blueprint 7dk |
| `TB` | Süre bonusu katsayısı (saniye başına) | 2 |
| `timeBonusCap` | Süre bonusu tavanı | 200 |
| `MIN` | Bitişte garanti taban puan (bitmek > bırakmak) | 100 |

### 6.2 Formül
```
attemptPenalty = A * max(0, failedRuns - freeAttempts)
hintPenalty    = Σ hintCost[i]  for each opened hint tier i   (sıralı: 1→2→3)
timeBonus      = min(timeBonusCap, max(0, TB * (parTime - actualTime_saniye)))

jobScore = clamp(
             BASE - attemptPenalty - hintPenalty + timeBonus,
             min = MIN,
             max = BASE + timeBonusCap
           )
```
- **"Başarısız deneme" tanımı (MVP):** win-condition'ı sağlamayan her `Run` (syntax error dahil)
  = 1 deneme. Basitlik için error/wrong-result ayrımı yapılmaz (v1'de yarım-ağırlık error opsiyonu).
- **Süre:** yalnızca Exploit'te sayılır; `parTime`'ı geçmek bonusu 0'a indirir ama **ceza yazmaz**
  (öğrenen ceza görmez). Erken bitiren bonus alır.
- **İpucu:** sıralı açılır; tier 1 ucuz (erken yardımı teşvik), tier 3 pahalı (payload'ı verir).

### 6.3 Oyuncu-yüzü basitleştirme
- **Yıldız (job):** `jobScore ≥ 900` → 3★ ("temiz iş") · `≥ 600` → 2★ ("dağınık ama oldu") ·
  bitiş → 1★ ("çakma ama loot çıktı").
- **Toplam rütbe (3 job):** `Σ jobScore` eşiğine göre in-world rütbe (ör. "Amateur / Pro / Made Man" —
  isimlendirme copywriter `06`). Rütbe kozmetik; hiçbir içeriği kilitlemez.

### 6.4 Puanlama alanlarının şemadaki yeri (semantik)
Yukarıdaki parametreler **level JSON'daki bir `scoring` nesnesine** yerleşir (kavramsal alan):
`{ base, freeAttempts, attemptPenalty(A), hintCost[3], parTime, timeBonusCoeff(TB), timeBonusCap, min }`.
**Alan adları architect'in kanonik şemasına bırakılır**; planner değerleri/semantiği verir.
Architect şemada `scoring` nesnesi öngörmüyorsa, **eklenmesi önerilir** (parent replan'de uzlaştırır);
aksi halde bu varsayılanlar **global default** olarak engine'e gömülür ve level yalnızca `parTime` override eder.

---

## 7. İpucu sistemi tasarımı

### 7.1 Ne zaman / nasıl açılır
- **Erişilebilirlik:** Exploit başından itibaren mevcut ama **talep üzerine** açılır (auto-force yok).
- **Sıralı açılım (progressive disclosure):** tier 1 açılmadan 2, 2 açılmadan 3 açılamaz. Near-solution'a
  atlamak, ucuz kademelerin maliyetini de yüklenmeyi gerektirir (skor bütünlüğü + pedagojik merdiven).
- **Soft trigger (opsiyonel):** N başarısız deneme (öneri 5) veya T dakika (öneri parTime) takıldıktan
  sonra UI tier 1'i **nazikçe önerir** ("Takıldın mı? Handler'da intel var.") — ama **açmaz**. Frustrasyon
  spiralini önler, agency'yi korur.
- **UI çerçevesi:** "Handler intel" paneli, 3 kilitli slot. Tıkla → maliyeti göster → onayla → aç.
  In-world çerçeve: ipuçları "ekipten gelen intel" (ses copywriter `06`).

### 7.2 İçerik yapısı — 3 kademe **içerik kategorisi** (yeniden-kullanılır kontrat)
Her level'ın `hints[]` girdisi bu taksonomiye uyar (kavramsal alan; adlar architect):
| Tier | Kategori | İçerik kuralı | Yazan / doğrulayan |
|------|----------|---------------|---------------------|
| 1 | **Kavramsal nudge** | Enjeksiyon noktasına / zihinsel modele işaret; **SQL sözdizimi YOK** | copywriter voice + planner yapı |
| 2 | **Teknik adı + yöntem** | Tekniği adlandır, genel yöntem; **kısmi sözdizimi, tam payload YOK** | security-analyst (doğru) |
| 3 | **Near-solution** | Somut payload (gerekirse doldurulacak boşlukla) | security-analyst (çalışan payload) |

- Her `hints[]` girdisi semantik olarak taşır: `{ tier (1|2|3), cost (→ scoring.hintCost), category, body }`.
  `cost` ve `tier` planner-semantiği; `body` metni tier'a göre security-analyst/copywriter doldurur.
- **Authorship handoff:** tier 3 payload metinleri **security-analyst** tarafından çalışır-doğrulukta
  verilir (yanlış payload = kritik hata, vision §10); tier 1 çerçeve dili copywriter.

---

## 8. Job'lar arası ilerleme / kilit açma

- **Doğrusal yay (arc):** Front Door → Vault → Blueprint. "Kapıyı aç → kasayı bul → planı çal"
  (vision §7). Beceri bağımlılığı gerçek (UNION, Vault'ta öğrenilip Blueprint'te tekrar kullanılır) →
  doğrusal kilit **pedagojik olarak gerekçeli**, keyfi değil.
- **Unlock tetikleyici:** bir job'ı **tamamlamak** (Loot/Debrief'e ulaşmak) sonrakini açar. Debrief'te
  "Sonraki iş" CTA'sı. **Mastery değil, tamamlama** yeter (3★ zorunlu değil → öğrenmeyi bloklamaz).
- **Kalıcılık (client-side, backend yok — vision §5,§9):** `localStorage`'da tutulur:
  `{ unlocked: jobId[], bestScore: {jobId→int}, stars: {jobId→1..3} }`. State mekanizması architect'e
  ait; planner **neyin persist edileceğini** belirtir.
- **Replay:** tamamlanan job'lar skor/yıldız iyileştirmek için tekrar oynanabilir; **en iyi skor** saklanır.
- **Hub ekranı ("job board / crew HQ"):** 3 job'ı kilit durumu + yıldız + payout ile listeler (görsel
  designer `04`; model: job listesi + lock/star/score state).
- **MVP kapsamı:** dallanma yok, yan job yok — kesin doğrusal 3. (v1: opsiyonel sıra / beceri-kapısı.)

---

## 9. Debrief pedagojisi — saldırı → savunma AKIŞI (YAPI)

> Bu bölüm **akışı/yapıyı** tasarlar. Güvenlik içeriğinin **DOĞRULUĞU** security-analyst'e (`03`)
> aittir; yerleşim (layout) designer'a (`04`). Planner: beat sırası + saldırı↔savunma eşleşmesi.

### 9.1 Beat sırası (rehberli, sıralı açılan)
1. **The Move — ne yaptın:** kazanan payload + ondan oluşan **gerçek SQL** tekrar gösterilir
   (aksiyon → sonuç yeniden bağlanır). Oyuncunun **kendi** çalıştırması kullanılır.
2. **Why it worked — açık (flaw):** sorgudaki enjeksiyon noktası vurgulanır; `vulnerableCode`
   (string concat ile sorgu inşası) gösterilir; input'un **veri'den kod'a** nerede taştığı işaretlenir.
3. **The Fix — savunma:** `secureCode` (parametreli/prepared statement) **yan yana** vulnerable ile;
   değişiklik diff-vurgulanır (concat → bound parameter).
4. **Why the fix closes it — neden kapatır:** parametrelerin kodu veriden ayırdığı, payload'ın artık
   **düz string literal** sayıldığı açıklanır; **bu job'ın kendi payload'ına** bağlanır
   (ör. "senin `' OR '1'='1'`'in zararsız bir username string'ine dönüşür").
5. **Takeaway — akılda kalan kural:** tek satır mnemonik ("Input'u SQL'e konkatlamayı bırak. Bind et.").
   Opsiyonel "defense card" koleksiyonu (yay boyunca biriken).

### 9.2 Sunum ilkeleri (yapısal)
- **Saldırı ↔ savunma YAN YANA:** kod beat'lerinde iki-kolon (Vulnerable | Secure) → kontrast görsel.
- **Progressive reveal:** beat'ler sırayla açılır (metin duvarı değil) → nedensel zincir oturur.
- **Oyuncunun kendi exploit'ine demirli:** her beat, jenerik örnek değil, oyuncunun **kullandığı gerçek
  payload'ı** referans alır → maksimum ilgililik.
- **Zorunlu ama ileri-atlanabilir:** ilk tamamlamada debrief öndedir (öğrenme atlanamaz); replay'de
  daralt/collapse edilebilir.
- **Alan eşlemesi:** beat 2–4 içerikleri `vulnerableCode` / `secureCode` / açıklama alanlarından gelir
  (architect şeması); planner **sıra + eşleşmeyi** tanımlar, security-analyst **doğruluğu** doldurur.

---

## 10. Başarı / başarısızlık geri bildirimi

### 10.1 Başarı (win-condition sağlandı)
- **Anlık:** sonuç grid'inde loot satır(lar)ı vurgulanır; "LOOT SECURED" anı (görsel/ses designer `04`).
- **Loot ekranı:** payout + skor kırılımı (deneme/süre/ipucu → puan) + yıldız → sonra Debrief.
- **Pekiştirme:** hangi payload'ın kazandığı gösterilir.

### 10.2 Başarısızlık (kazanamayan `Run`) — **kalıcı kayıp YOK**
Sandbox bulmacasıdır; "fail" = win sağlamayan çalıştırma. Feedback türleri:
| Durum | Geri bildirim | Ton ilkesi |
|-------|---------------|------------|
| **Syntax error** | SQLite hata mesajı **birebir** gösterilir (öğretici; error-based habercisi) + dostça in-world gloss | Bilgilendirici, asla azarlayıcı değil |
| **Geçerli sorgu, yanlış sonuç** | Sonuç grid'i (boş/yanlış satırlar) + nötr nudge ("Sorgu çalıştı. Bu satırlarda loot yok — doğru yerden çekmiyorsun.") | İterasyonu teşvik |
| **Ara ilerleme (milestone)** | Çok-adımlı job'larda ara sinyal tanınır — Vault: "Kolon sayısını buldun: 3. Şimdi veriyi çek." · Blueprint: "Şema açığa çıktı — tabloları görebiliyorsun." | Momentum + doğru-yoldasın sinyali |

- **Ara ilerleme sinyalleri**, win-condition DSL'iyle (architect) modellenebilecek **non-terminal
  kontroller**dir (telemetri + adaptif ipucu tetikleyicisi olarak da kullanılır). Semantik planner'da;
  biçim architect'te.
- **Anti-frustrasyon:** tekrar eden başarısızlıktan sonra ipucu **önerisi** yüzeye çıkar (§7.1). Asla
  "kaybettin, baştan başla" yok — her seferinde taze DB (§2.6).
- **Mikro-feedback (Exploit sırasında):** canlı SQL paneli yazdıkça güncellenir (anlık yapısal feedback);
  opsiyonel inline lint (ör. dengesiz tırnak) — **v1 nicety**, MVP'de zorunlu değil.

---

## 11. Level-JSON game-design semantiği (konsolidasyon — architect alanlarına atıf)

> **Rakip şema DEĞİL.** Architect'in kanonik alanlarına **game-design anlamını** iliştirir.
> Kesin adlar/tipler `01`; parent replan'de uzlaştırır. Aşağıda "kavramsal alan → planner semantiği".

| Kavramsal alan (vision §5) | Planner-semantiği (bu dokümanın doldurduğu) |
|-----------------------------|----------------------------------------------|
| `winCondition` | İki assertion primitifi gerekir: **row-match** (predikat, ör. `is_admin=1`) ve **value-contains** (seed'li gizli değer). Değerler `05` seed'iyle hizalı. |
| `hints[]` | Girdi başına `{ tier:1\|2\|3, cost, category(nudge\|technique\|near-solution), body }`; sıralı açılım; tier→cost eşlemesi `scoring.hintCost`. |
| `scoring` (öneri: eklenecek) | `{ base, freeAttempts, attemptPenalty, hintCost[3], parTime, timeBonusCoeff, timeBonusCap, min }` — §6.1 varsayılanları. |
| `vulnerableCode` / `secureCode` | Debrief beat 2–4 eşleşmesini besler (attack↔fix yan yana); **doğruluk `03`**. |
| `queryTemplate` | Enjeksiyon noktalı; recon'da gizli, Exploit'te canlı SQL olarak görünür. Şekli §4'te per-job (biçim `01`, seed uyumu `05`). |
| oyuncu-state (JSON değil, runtime) | `localStorage`: `{ unlocked[], bestScore{}, stars{} }` (§8). |

---

## 12. Varsayımlar ve karar günlüğü (deep-interview: interaktif kullanıcı yok → varsayımlar yüzeye çıkarıldı)

| Karar | Seçim | Neden | Reddedilen alternatif |
|-------|-------|-------|------------------------|
| Skor felsefesi | Öğrenme-öncelikli; skor ilerlemeyi bloklamaz | Eğitim oyunu; ceza öğrenmeyi caydırır | Sert ceza / skor-kapılı ilerleme |
| Süre modeli | Par-time **bonusu** (pozitif) | Tırmanan ceza anksiyete yaratır | Lineer artan zaman cezası |
| Deneme cezası | `freeAttempts` sonrası başlar | Deney oyunun özü | Her denemeyi cezalandırma |
| İpucu açılımı | Sıralı (1→2→3), talep üzerine | Skor bütünlüğü + pedagojik merdiven | Doğrudan tier-3'e atlama |
| Unlock kapısı | Tamamlama (herhangi ★) | Mastery kapısı öğrenmeyi bloklar | 3★ zorunlu unlock |
| Vault tablo adı | **Bilinir** | Bilinmeyen tablo keşfi Blueprint'in dersi | Vault'ta da sqlite_master zorunluluğu |
| Blueprint kolon sayısı | Vault'tan **farklı** (öneri 2) | Kolon-sayısı becerisini tekrar ettirir | Aynı sayı (tekrar yok) |
| Ara ilerleme sinyali | Var (non-terminal kontrol) | Uzun zincirde momentum | Yalnız terminal win |

**Açık sorular (parent/diğer agent'lara):**
1. `scoring` nesnesi kanonik şemaya eklenecek mi, yoksa engine-global default + level `parTime` override mı? (architect + parent)
2. Vault/Blueprint **kesin** kolon sayıları (öneri 3/2) — `05` seed'iyle kilitlenmeli.
3. Ara ilerleme sinyalleri win-condition DSL'inde non-terminal olarak mı modellenecek? (architect)
4. Input yüzeyi (form-field / konsol / ikisi) — architect kararı; job recon yüzeyleri her iki UX'te de çalışacak şekilde tasarlandı.

---

## 13. Riskler + doğrulama (premortem-lite · design-level)

| Risk | Etki | Mitigasyon |
|------|------|------------|
| **Win-condition false-positive** — oyuncu tabloyu keşfetmeden şans eseri kazanır | Öğrenme atlanır | Loot değeri **yalnızca hedef tabloda** seed'lensin (`05`); `value-contains` o gizli değere bağlı olsun |
| **Win-condition false-negative** — doğru payload win saymaz | Frustrasyon | İki payload yolu (Front Door), seed ile payload'ın `03`↔`05` uyum testi |
| **Zorluk uçurumu** (Front Door → Vault) | Bırakma | Ara ilerleme sinyalleri + kademeli ipucu; Vault tablo adını verme |
| **İpucu "gaming"i** (tier-3 spam) | Skor anlamsızlaşır | Sıralı açılım + tier-3 pahalı (300) |
| **Blueprint tahminle çözülür** (keşif atlanır) | T5 öğretilmez | Tahmin-edilemez tablo adı; Vault kısayolu kapalı |
| **Süre bonusu sömürüsü** (hızlı ama ipucuyla) | Skor şişer | `timeBonusCap` + hint penalty birlikte |

### Doğrulama / playtest stratejisi (test-strategy-lite)
- **Win-condition doğruluğu (birim):** her job için beklenen payload → win TRUE; yakın-ama-yanlış payload → win FALSE (data-driven, engine değişmeden). `03` payload'ları ↔ `05` seed'i entegrasyon uyumu.
- **Difficulty playtest:** hedef kitle (SQL bilen, injection'a yabancı) 3 job'u ipuçsuz/ipuçlu dener; takılma noktaları ölçülür.
- **Hint etkinliği:** her tier'ın çözüme götürme oranı; tier-1 nudge tek başına yeterli mi?
- **Kapsam:** engine/win-condition mantığı yüksek öncelik (unit); tam döngü Playwright ile 1 kritik akış (E2E) — implementasyon fazının test roster'ı `PLAN.md`'de.

---

## 14. Gate-2 agent'larına devir (bu dokümandan besleneceklerin)
- **security-analyst (`03`):** tier-2/3 ipucu payload metinleri (çalışır-doğru); debrief beat 2–4
  içeriği (vuln neden çalıştı + parametreli fix + neden kapatır). §4 payload örnekleri **doğrulanmalı**.
- **data-modeler (`05`):** loot değerleri (X, Y) **yalnızca** hedef tabloda; Vault kolon sayısı (öneri 3)
  ↔ UNION payload uyumu; Blueprint tablo adı tahmin-edilemez; admin satırı (`is_admin=1`) seed'i.
- **designer (`04`):** 5 ekran (Brief/Recon/Exploit/Loot/Debrief); canlı SQL paneli; debrief iki-kolon
  (attack↔fix); "Handler intel" ipucu paneli (3 kilitli slot); job board hub.
- **copywriter (`06`):** handler brief'leri (tekniği spoil etmeden telegraf); tier-1 nudge çerçeve dili;
  loot-reveal + rütbe adları; başarısızlık gloss'ları (azarlamayan ton).


