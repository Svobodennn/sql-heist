# SQL Heist — Vizyon Dokümanı (00)

> Gate 0 çıktısı. Bütün alt planların (01–06) dayanacağı ortak kontrat.
> Statü: **TASLAK — kullanıcı onayı bekliyor.**

## Tek cümle
Oyuncunun bir soygun ekibinin *hacker*'ı olarak, gerçek bir SQLite motoruna karşı
SQL injection teknikleriyle "iş"leri çözdüğü; her bölümün sonunda saldırının nasıl
savunulacağını öğreten, tarayıcı-tabanlı bir eğitim oyunu.

## 1. Eğitim tezi
- **Saldırıyı öğret → savunmayı öğret.** Her injection tekniği, hemen ardından
  "bu neden çalıştı + parametreli sorgu ile nasıl kapatılır" eşleşmesiyle biter.
- **Gerçek motor, gerçek payload, güvenli sandbox.** Kandırma yok; oluşan SQL
  şeffaf gösterilir. Oyuncu ne yazdığını ve neden çalıştığını görür.

## 2. Hedef kitle
SQL bilen ama injection'a yabancı geliştiriciler; güvenliğe yeni başlayanlar;
CTF/eğitim meraklıları.

## 3. Tema — Heist Crew
- Oyuncu = ekibin hacker'ı. Bir *handler* (fixer) her bölümde bir **iş (job)** verir:
  hedef sistemin veritabanına sız, **loot**'u (kanıt/veri/flag) çıkar.
- Ton: noir + heist gerilimi. Her bölüm bir "job", her job bir hedef veritabanı.

## 4. Çekirdek döngü
1. **Brief** — handler işi anlatır (hedef, aranan loot).
2. **Recon** — hedef web app'i incele (login formu / arama kutusu / URL param).
3. **Exploit** — input alanına payload yaz → gerçek SQL oluşur ve SQLite'a karşı çalışır.
4. **Loot** — win-condition sağlanınca (hedef satır / gizli flag) bölüm biter.
5. **Debrief (savunma)** — oluşan SQL + zafiyetli kod + parametreli güvenli versiyon.

## 5. Teknik direkler
- **Next.js** (App Router) + TypeScript.
- **sql.js (SQLite → WASM)** — %100 tarayıcıda, backend yok, güvenli sandbox.
  Her bölüm taze bir DB yükler.
- **Client-side, statik host** (Vercel). MVP'de backend gerekmez.
- **Data-driven bölümler** — her level bir JSON: query template, schema, seed data,
  win-condition, hints, vuln kod, secure kod.
- Input yüzeyi (form-field taklidi mi, kod-editör konsolu mu) → Gate 1 architect kararı.

## 6. Müfredat (tam liste — fazlara bölünür)
1. Auth bypass (tautology + comment)
2. Comment injection (`--`, `#`, `/* */`)
3. Kolon sayısı bulma (`ORDER BY n` / `UNION SELECT NULL,...`)
4. UNION-based extraction
5. Şema keşfi (`sqlite_master`)
6. Error-based
7. Blind boolean-based
8. Blind time-based
9. Stacked queries
10. Second-order
11. WAF / filter bypass

## 7. MVP kapsamı — 3 job (soygun yayı)
- **Job 1 · "The Front Door"** — Auth bypass. `' OR '1'='1' --` ile login kırma. (Teknik 1–2)
- **Job 2 · "The Vault"** — UNION-based extraction. Kolon sayısı bul + `UNION SELECT` ile
  yan tablodan veri çek. (Teknik 3–4)
- **Job 3 · "The Blueprint"** — Şema keşfi (`sqlite_master`) → loot'u çıkar. (Teknik 5)

Her job sonunda zorunlu savunma debrief'i. Yay: **kapıyı aç → kasayı bul → planı çal.**

## 8. Fazlar
- **MVP (v0):** Çekirdek döngü + 3 job + savunma katmanı + data-driven engine.
- **v1:** Kalan tek-oyunculu teknikler (error / blind / stacked / second-order / WAF),
  recon defteri, skor + rozet, ipucu sistemi.
- **Sonrası:** Blue-team modu (kod düzelt), co-op / CTF race, prosedürel job üretimi,
  level editor.

## 9. Non-goals (MVP'de YOK)
- Gerçek/uzak hedeflere saldırı — her şey local sandbox.
- Backend, kullanıcı hesabı, çok-oyunculu.
- MySQL/Postgres-özel payload'lar (MVP SQLite; motor farkları v1+).
- Prodüksiyon-grade art/ses.

## 10. Başarı kriterleri (MVP)
- 3 job baştan sona oynanabilir; injection **gerçekten** çalışıyor.
- Her job'da savunma debrief'i (vuln ↔ secure) doğru ve net.
- Yeni bölüm eklemek = JSON eklemek (engine kodu değişmeden).
- Statik build; tek komutla deploy.
- İçerik güvenlik açısından doğru (security-analyst onayı).

## 11. Kilitlenen kararlar
Tema: heist crew ✓ · Framework: Next.js ✓ · Motor: sql.js/SQLite WASM (client-side) ✓ ·
MVP: 3 job ✓ · Savunma katmanı zorunlu ✓ · Data-driven JSON level ✓

## 12. Açık sorular (Gate 1'de netleşecek)
- Input UX: form-field taklidi mi, kod-editör konsolu mu, yoksa ikisi birden mi?
- Level JSON şeması + win-condition DSL'inin kesin biçimi (architect + data-modeler).
- Puanlama formülü (planner).
