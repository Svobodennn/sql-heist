# 06 — Anlatı & Copy (SQL Heist)

> Gate 2 çıktısı (copywriter). Kanonik kaynaklar: `00-vision.md` (§3 tema, §7 yay),
> `01-architecture.md` (§4 şema alanları, §6 input yüzeyi, §8 per-job skeleton),
> `02-game-design.md` (döngü, ipucu merdiveni, skor/yıldız, debrief pedagojisi),
> `locked-contract.md` (3 job yayı DONMUŞ).
> Statü: **TASLAK — parent sentezi bekliyor.**
>
> **SAHİPLİK (bu doküman ne yazar):** in-world tüm metin — handler sesi, job brief'leri
> (`brief.handler/text/objective`), loot-reveal, debrief **çerçevesi**, ton rehberi, microcopy,
> onboarding, rütbe adları, `target.appName`, alan etiket/placeholder'ları.
> **NE YAZMAZ (devir):** debrief'in TEKNİK gövdesi (`debrief.explanation`, `vulnerableCode`,
> `secureCode`) + tier-2/3 ipucu payload'ları → **security-analyst (03)**. Ben o içeriğin
> etrafındaki geçiş/çerçeve metnini yazarım; doğruluk 03'te. Loot değerlerinin (flag string)
> kendisi **data-modeler (05)** seed'inde; ben yalnızca onları *sunan* copy'yi yazarım.

---

## 0. Dil kararı (content-strategist notu)

**KARAR: Oyun-içi tüm copy İNGİLİZCE. Bu planlama dokümanının çerçeve/gerekçe metni Türkçe.**

Gerekçe (bu bir ürün kararı, keyfi değil):
1. **Tür İngilizce doğar.** Film-noir + heist, Amerikan bir dil. Noir sesi Türkçe'ye çevrilince
   "çeviri kokar", immersion kırılır. Ses ancak öz dilinde sert ve inandırıcı.
2. **Hedef kitle geliştirici** (vision §2) — SQL, `admin`, `UNION`, CTF flag'leri zaten İngilizce.
   Teknik yüzey İngilizce iken diyalog Türkçe = kod-anahtarlama gürültüsü.
3. **Sibling dokümanlarla tutarlı.** 01/05'teki artefakt'lar (`appName: "AcmeCorp Admin"`,
   `label: "Username"`) zaten İngilizce. 06 aynı deseni izler: Türkçe planlama + İngilizce artefakt.

**Lokalizasyon yolu açık:** Türkçe (veya çok-dilli) sürüm istenirse ses rehberi (§4) porte edilir;
devir **babel / i18n-expert**'e (handoff §11). Oyun-içi string'ler `i18n` anahtarlarına hazır
yazıldı (tek kaynak, İngilizce master).

> **Okuma kılavuzu:** `> GAME COPY` bloklarındaki metin **oyuna gömülebilir, kullanıma hazır**dır
> (placeholder değil). Türkçe paragraflar tasarım/gerekçe/devir notudur, oyuna girmez.

---

## 1. Soygun yayı — hikâye omurgası

**Mark (hedef):** **Meridian** — bir veri-simsarı holding. İnsanların sırlarını alıp satar; onları
soymak "kirliyi soymak"tır (oyuncuya ahlaki örtü — klasik heist gerekçesi, hafif dokunuş). Üç job,
Meridian'ın üç ayrı kapısı; tek tırmanan iş.

**Yay mantığı (test işi → asıl iş → gerçek ödül):**

| Job | Kapı | In-world hedef | Teknik (spoil edilmez) |
|-----|------|----------------|-------------------------|
| **The Front Door** | Meridian — Staff Portal (login) | İçeri gir. Kilidi olmayan kapıyı bul, admin rozeti tak. | auth bypass |
| **The Vault** | Meridian Market (storefront arama) | Para. Vitrin aramasıyla hesap defteri aynı kuyudan içer — defteri çek. | kolon-sayısı + UNION |
| **The Blueprint** | Meridian Press (makale arama) | Asıl geliş sebebi. Sana verilmeyen odayı lobideki dizinden bul, planı al. | `sqlite_master` keşfi |

Tırmanış duygusu: **kapıyı aç → parayı bul → asıl ödülü çal.** Beceri bağımlılığı gerçek (UNION
Vault'ta öğrenilir, Blueprint'te tekrar kullanılır) → doğrusal kilit pedagojik gerekçeli (02 §8).

---

## 2. Metafor sistemi (tekniği spoil etmeden telegraf eden through-line)

Brief'ler tekniği ADLANDIRMAZ (02 §2.1 "kategoriyi telegraf et, tekniği spoil etme"). Bunun yerine
tutarlı bir **bina metaforu** zihinsel modeli kurar — sözdizimi vermeden yönü gösterir:

| SQL gerçeği | Noir metaforu | Nerede telegraf edilir |
|-------------|---------------|-------------------------|
| Sorgu = arka odaya iletilen istek | "Kâtibe uzattığın pusula" | tüm brief'ler |
| WHERE / password kontrolü | "Kapıdaki kilit" | Front Door |
| Input'un sorguya konkatlanması | "Ne uzatırsan onu harfiyen okur" | Front Door nudge |
| UNION + kolon eşleşmesi | "Aynı nefeste iki şey iste — ama beklediği şekle uy" | Vault |
| `sqlite_master` katalog | "Lobideki bina dizini — her odayı listeler" | Blueprint |
| Gizli tablo | "Sana verilen haritada olmayan oda" | Blueprint |

Bu sistem hem noir çerçeveyi tutar hem mental modeli sözdizimi vermeden kurar. Debrief'te (§6) aynı
metafor "gerçek kilit nasıl olur" diye savunmaya bağlanır → tek dünya, tek dil.

---

## 3. Karakter: The Fixer

Tek ses. MVP'de crew tek kişiden konuşur (temiz, tutarlı; v1'de crew genişleyebilir). Job'lar
The Fixer'dan güvenli bir hat üzerinden gelir. `brief.handler = "The Fixer"` (şema örneğiyle bire bir).

**Kim:** İşi veren fixer. Gölgede kalır, isim vermez, senden fazlasını bilir ama azını söyler.
Yetkinliğe saygı duyar, gürültüden nefret eder. Altında sıcak ama asla duygusal değil.

**Ses direkleri:**
1. **Kısa.** Kısa cümle. Parça cümle serbest. Boş kelime yok.
2. **İkinci tekil, direkt.** "You're in. Or you're not."
3. **Söylediğinden fazlasını bilir.** İma eder, saklar. Tekniği hiç adlandırmaz.
4. **Sokak dili, akademik değil.** "SQL injection", "tautology" demez. "The lock", "the well",
   "the catalog", "the manifest" der.
5. **Baskı altında serin.** Stake yükselse de panik yok. Kuru, biraz tehlikeli.

**İmza hamleleri:** Övmez — "seni tekrar arar", övgüsü budur. Cümleyi bir uyarıyla kapatır.
Metaforu asla bozmaz.

**Ses do/don't:**

| DO | DON'T |
|----|-------|
| "Don't knock. Hand it something it wasn't built to read." | "Use a SQL injection payload here." |
| "Guessing's for amateurs and dead men." | "Try to guess the table name." (düz, gerilimsiz) |
| Metaforla yönü göster | Sözdizimi/teknik adı ver (o ipucu tier 2–3'ün işi) |
| İki kısa cümle, sonra sus | Paragraf paragraf açıklama |
| Kuru mizah, tehdit alt tonu | Şaka, emoji, tezahürat ("Great job! 🎉") |

**Ölçek örnek satırlar (ton kalibrasyonu):**
> GAME COPY — Fixer, jenerik
> - "You've got a talent for finding the gap. I've got work that pays for it."
> - "No names. No mess. You do the job, you take the loot, you walk."
> - "Every lock's a promise somebody didn't keep."

---

## 4. Per-job copy (oyuna hazır)

Her job için: `appName` + yüzey · `brief.*` (game-ready) · alan microcopy · tier-1 ipucu çerçevesi
(benim; tier 2–3 → 03) · loot-reveal · yıldız-kademe flavor'ı.

### 4.1 Job 1 — The Front Door  ·  `target.surface: login-form`

**`target.appName`:** `Meridian — Staff Portal`
**Alanlar (microcopy):** `username` → label `Username`, placeholder `Employee ID` ·
`password` → label `Password`, placeholder `••••••••`
*(Placeholder'lar GERÇEK kurumsal login gibi görünsün — recon gerçekçiliği; ipucu vermez.)*

> GAME COPY — `brief.handler`: `The Fixer`
> GAME COPY — `brief.text`:
> Meridian keeps its people behind a staff login. One box for a name, one for a password.
> That's the whole door.
>
> Here's the thing about that door — it trusts whatever you hand it. Writes it straight into the
> question it asks the back room, word for word.
>
> So don't knock. Hand it something it wasn't built to read.

> GAME COPY — `brief.objective`: `Get inside — as someone who runs the place.`

**Tier-1 ipucu (kavramsal nudge — benim; SQL YOK):**
> GAME COPY: "The lock only checks what you hand it. What if what you hand it isn't just a name —
> what if it closes the quote and changes the question?"

*(Tier 2 "the method" ve tier 3 "the play" = security-analyst 03, çalışan payload.)*

**Loot-reveal (win → `LootBanner`):**
> GAME COPY — headline: `YOU'RE IN.`
> GAME COPY — Fixer: "That's an admin's badge on your chest. Nobody stopped you — nobody will,
> until somebody bothers to lock that door right. Come see how they should've."

**Yıldız flavor'ı (02 §6.3 · 900/600/tamamlama):**
> GAME COPY
> - 3★ "Clean. In and out, no fingerprints. The Fixer won't say nice work — he'll just call again."
> - 2★ "Messy, but the badge is real. Tripped an alarm nobody was listening to. It'll do."
> - 1★ "Ugly. Loud. You're in, barely. A job's a job — but run it clean next time."

---

### 4.2 Job 2 — The Vault  ·  `target.surface: search-box`

**`target.appName`:** `Meridian Market`
**Alan (microcopy):** `q` → label `Search products`, placeholder `Try "coffee", "chair"…`

> GAME COPY — `brief.handler`: `The Fixer`
> GAME COPY — `brief.text`:
> You're inside. Good. Now the money.
>
> Their storefront's got a search box — type a product, it hands you back rows. Looks harmless.
> But that search and the account ledgers drink from the same well.
>
> Ask it for a product and it answers polite. Ask it for a product *and* the ledger in the same
> breath — and it hands you both. Long as you match the shape it expects. Pull me the vault.

> GAME COPY — `brief.objective`: `Pull a hidden account off a shopping page.`

**Tier-1 ipucu (nudge — benim):**
> GAME COPY: "The search only knows how to hand back one shape of answer. Learn that shape first —
> how wide it is — then a second question can ride out on the same tray."

*(Kolon-sayısı ve UNION payload'u tier 2–3 = 03.)*

**Ara-ilerleme mesajları (02 §10.2 milestone — momentum):**
> GAME COPY
> - Kolon sayısı bulundu: "That's the shape of it — [n] wide. Now fill it with what you actually want."
> - Geçerli sorgu, loot yok: "It went through clean. Just nothing worth taking in there — wrong drawer."

**Loot-reveal:**
> GAME COPY — headline: `VAULT'S OPEN.`
> GAME COPY — Fixer: "There it is — an account that's got no business on a shopping page. That's the
> take. They stacked the money next to the milk and called it a database."

**Yıldız flavor'ı:**
> GAME COPY
> - 3★ "Two questions, one breath. The clerk never blinked. That's craft."
> - 2★ "Took a few tries to match the shape, but the ledger's in your pocket."
> - 1★ "You brute-forced your way to it. Loot's loot — but that was noise, not craft."

---

### 4.3 Job 3 — The Blueprint  ·  `target.surface: search-box` (v1: `url-param`)

**`target.appName`:** `Meridian Press`
**Alan (microcopy):** `q` → label `Search the archive`, placeholder `Search articles…`

> GAME COPY — `brief.handler`: `The Fixer`
> GAME COPY — `brief.text`:
> This is why we came.
>
> The plans aren't on any list they gave us. No map, no table of contents. And no guessing — guessing's
> for amateurs and dead men.
>
> But every building keeps a directory in the lobby. Lists every room, even the ones nobody mentions.
> This place keeps a catalog of everything it's holding. Read it. Find the room that isn't on our map.
> Walk out with the blueprint.

> GAME COPY — `brief.objective`: `Find the unlisted room. Take the blueprint.`

**Tier-1 ipucu (nudge — benim):**
> GAME COPY: "You've got the trick from the Vault. What you don't have is the room number. Stop
> guessing — the building keeps a list of its own rooms. Ask it for that list first."

*(`sqlite_master` sorgusu + hedefli extraction tier 2–3 = 03.)*

**Ara-ilerleme mesajları:**
> GAME COPY
> - Şema açığa çıktı: "There's your directory — every room in the building, including the one they
>   never told you about. Now go take what's in it."
> - Geçerli sorgu, loot yok: "The catalog's talking, but that's not the blueprint. Read the odd
>   name in the list — that's your room."

**Loot-reveal (yay finali):**
> GAME COPY — headline: `GOT THE PLANS.`
> GAME COPY — Fixer: "That's it. The whole thing. You didn't guess your way in — you made the
> building tell you where it hid its own secret. That's not a thief. That's a ghost."

**Yıldız flavor'ı:**
> GAME COPY
> - 3★ "You read the building and it never knew. Cleanest work I've seen. Don't get comfortable."
> - 2★ "Took the long way through the catalog, but the plans are ours."
> - 1★ "Rough, loud, and the plans are on the table anyway. We'll take it."

---

## 5. Debrief çerçeveleme copy'si (in-world savunma geçişi)

**Amaç:** Zorunlu savunma dersini (02 §9) okul dersi gibi değil, *crew bilgeliği* gibi hissettir.
**Çerçeve:** "A pro knows both sides of every door." The Fixer seni geri yürütür — övünmek için değil,
tutan kilitle tutmayanın farkını bilesin diye. Bu, blue-team dersinin noir gerekçesidir: fix'i anlayan
daha iyi kırar (ve akıllı para eninde sonunda güvenliği satar).

**Yapı (02 §9.1 beat sırasına oturur):**
`[Fixer intro — benim] → [The Move / Why it worked / The Fix / Why it closes it — TEKNİK GÖVDE: 03] → [Fixer takeaway çerçevesi — benim, doğruluk 03 onaylar]`

> GAME COPY — Debrief genel intro (Fixer, her job):
> "Every job you just pulled, somebody left a door open. Here's how it should've been locked.
> Learn it — next time you might be the one guarding it."

**Per-job geçiş copy'si (in → out). Aradaki teknik gövde 03'e ait.**

**Front Door:**
> GAME COPY — in: "You didn't pick that lock. There was no lock. They built the door to read
> whatever you slid under it as part of the key."
> — [03: `explanation` + `vulnerableCode` (concat) ↔ `secureCode` (parametreli)]
> — takeaway çerçevesi (`debrief.takeaway`, sözcükler benim / doğruluk 03):
> `Stop gluing what people type onto your questions. Bind it — and "or one equals one" is just a bad username again.`

**The Vault:**
> GAME COPY — in: "The search and the vault shared a well, so one question could scoop from both.
> A real lock keeps the money's table off the menu — and keeps the question fixed no matter what
> you type."
> — [03: kolon-eşleşme / UNION neden çalıştı + parametreli fix]
> — takeaway çerçevesi: `If the query's shape can't change, no second question rides in on it.`

**The Blueprint:**
> GAME COPY — in: "You made the building hand you its own directory. Handy for you — a nightmare
> for them. The fix isn't hiding the catalog; it's making sure a search box can never ask for it."
> — [03: `sqlite_master` maruziyeti + parametreli/least-privilege fix]
> — takeaway çerçevesi: `Least privilege and bound parameters: a search box should only ever search.`

> **03'e not:** Takeaway sözcüklerini akılda-kalır yazdım; teknik olarak DOĞRU olduklarını sen
> onayla/ince ayar yap. Yanlışsa senin ifaden kazanır (doğruluk > cazibe).

---

## 6. Ton rehberi (noir + heist gerilimi) — global do/don't

**Noir DNA:** kısa cümle, somut duyusal detay (yağmur, neon, kâğıt), az sıfat, alt-metin > açıklama,
serin baskı. Oyuncu asla azarlanmaz; asla tezahürat yapılmaz.

| DO | DON'T |
|----|-------|
| Kısa, direkt, ikinci tekil. "You're in." | Uzun açıklama, pasif cümle. "Access has been granted." |
| Sonucu somut kıl. "An admin's badge on your chest." | Soyut övgü. "Success! Great work!" |
| Başarısızlığı bilgilendir, suçlama. "Wrong drawer." | Azarla. "Incorrect. Try again." / "You failed." |
| Tekniği metaforla telegraf et. | Brief'te tekniği adlandır (spoil). O ipucunun işi. |
| Kuru mizah, tehdit alt tonu. | Emoji, ünlem yağmuru, kutlama. |
| Tek ses (The Fixer) tutarlı. | Ton kayması (bir yerde noir, bir yerde neşeli asistan). |
| Debrief'i crew bilgeliği yap. | Debrief'i ders/uyarı levhası yap. |

**Kelime paleti (tercih edilen):** the mark, the door, the lock, the well, the catalog, the take,
the loot, the wire, clean, loud, ghost, badge, ledger, manifest.
**Kaçınılan:** user, submit, success, error occurred, oops, awesome, congrats, please try again.

---

## 7. Microcopy kütüphanesi (in-theme UI etiketleri)

Ana versiyon + A/B alternatifi (varsa). Karakter limitleri designer/frontend için §10'da.

**Navigasyon / akış butonları:**
> GAME COPY
> - Landing CTA: `Take the first job`  · A/B: `Meet the Fixer`
> - Brief → primary: `Take the job`  · secondary: `Case it first`
> - Recon → exploit: `Make your move`
> - Loot → debrief: `See how they slipped`  · A/B: `The debrief`
> - Debrief → next: `Next job's waiting`  · yay finali: `Walk away a ghost`
> - Replay: `Run it cleaner`

**Exploit ekranı (oyunun kalbi):**
> GAME COPY
> - Canlı SQL preview paneli başlığı: `THE WIRE`  · alt: `What actually reaches the mark`
>   *(Şeffaflık = pedagoji; "ne yazarsan gerçekte bu gidiyor" — vision §1'i in-world söyler.)*
> - Çalıştır butonu: `Send it`  · A/B: `Run the job` / `INJECT`
> - Sonuç grid başlığı: `WHAT CAME BACK`
> - Boş sonuç state: `Nothing worth taking.`

**İpucu tepsisi (02 §7 · "Handler intel", 3 kilitli slot):**
> GAME COPY
> - Panel: `Call the Fixer`
> - Slot 1 (nudge, cost 50): `A word`
> - Slot 2 (technique, cost 150): `The method`
> - Slot 3 (near-solution, cost 300): `The play`
> - Slot açma onayı: `Costs you [N]. Still want it?` → `Make the call` / `Not yet`
> - Soft-trigger toast (02 §7.1 — önerir, açmaz): `Stuck? The Fixer's on the line.`

**Başarısızlık / hata mesajları (asla azarlamaz — 02 §10.2):**
> GAME COPY
> - Syntax error (SQLite mesajı BİREBİR gösterilir + altına gloss):
>   `The mark choked on that. Read what it spat back — it's telling you where you slipped.`
>   *(error-based tekniğin habercisi; hata = öğretici, ceza değil.)*
> - Geçerli sorgu, yanlış/boş sonuç: `It ran clean. Just nothing in there worth taking — you're
>   reaching into the wrong drawer.`
> - Tekrarlayan başarısızlık (anti-frustrasyon): azarlama YOK → yalnızca soft-trigger yüzeye çıkar.
>   Asla "You lost / Start over" YOK — her Run taze DB (mimari §2.2).
> - WASM yükleme hatası (mimari §2.1 `error` state): `Line's dead. Couldn't reach the job.`
>   + retry butonu `Try the line again`.

**Job board / hub (02 §8 crew HQ):**
> GAME COPY
> - Başlık: `THE BOARD`  · alt: `Three jobs. One score.`
> - Kilitli job: `Locked — finish the last job first`
> - Payout etiketi: `Payout` · yıldız etiketi: `Clean` (3★) / `Done` (2★) / `Loud` (1★)

---

## 8. Onboarding / intro anlatısı

**Landing (page.tsx):** Atmosfer + tek CTA. Oyunun ne olduğunu 2 satırda söyle, sonra çek.
> GAME COPY — Landing
> - Kicker: `MERIDIAN HOLDINGS · after hours`
> - Headline: `Every system has a door somebody forgot to lock.`
> - Sub: `You find them. A real database is on the other side — no simulation, no safety net but
>   the sandbox. Pull three jobs. Then learn how they should've stopped you.`
> - Primary CTA: `Take the first job`  · A/B: `Meet the Fixer`

**Recruitment (ilk giriş, jobs/layout çerçevesi — The Fixer'ın ilk mesajı):**
> GAME COPY — Fixer, intro
> "You've got a talent for finding the gap. I've got work that pays for it.
> No names. No mess. You do the job, you take the loot, you walk.
> First one's the front door. Everybody's got a bad lock. Let's find theirs."

**İlk-Run onboarding (Exploit ekranı, ilk kez — tek seferlik coach-mark, in-world):**
> GAME COPY
> - `THE WIRE` üstü: `Whatever you type, watch it here — this is what really reaches the mark.`
> - `Send it` yanı: `Run it. Wrong won't cost you — the room resets every time.`
> *(Fail-safe sandbox'ı in-world öğretir: deneme serbest, 02 §1.)*

---

## 9. Rütbe & ilerleme copy'si (kümülatif — 02 §6.3 devri)

Rütbe kozmetik, hiçbir içeriği kilitlemez (02 §6.3). Σ jobScore'a göre. **Adlar benim; kesin
eşikler planner'ın** — aşağıdaki bantlar öneri (base 1000/job × 3 ≈ 3000 + bonus tavanı).

> GAME COPY — Ranks (düşükten yükseğe)
> - `Nobody` — başlangıç
> - `Runner` — ilk loot
> - `Earner` — ~2 job temiz civarı
> - `Made` — güçlü toplam
> - `Ghost` — üç job, neredeyse iz yok (en üst)

> GAME COPY — Yay finali (3 job bitince, rütbeye göre kapanış — Fixer):
> - Ghost: "Three jobs, no fingerprints. You're not a thief anymore. You're a rumor."
> - Made:  "Three jobs, three payouts. You've got a name now — the quiet kind."
> - alt:   "The loot's real and the plans are ours. Rough edges. We'll sand them next time."

*(A/B fikri: rütbe adlarını suç-ailesi tonundan hacker-underground tonuna kaydırma —
`Script Kid → Runner → Operator → Made → Ghost`. Playtest'te hangisi daha çok "sahiplenildi" ölçülür.)*

---

## 10. Designer (04) & Frontend notları — metin uzunluğu / karakter limitleri

Copy bu sınırlara göre yazıldı; layout bunlara güvenebilir.

| Öğe | Limit | Not |
|-----|-------|-----|
| `brief.text` | 45–75 kelime, ≤3 kısa paragraf | Briefing paneline sığar; kaydırma istemez |
| `brief.objective` | ≤ 12 kelime, tek satır | Recon/exploit'te sabit üst-şerit |
| Loot banner headline | ≤ 16 karakter, ALL-CAPS dostu | `YOU'RE IN.` / `VAULT'S OPEN.` / `GOT THE PLANS.` |
| Buton etiketi | ≤ 18 karakter | Tek satır, wrap yok |
| İpucu slot etiketi | ≤ 14 karakter | 3 slot yatay sığar |
| Hata gloss'u | ≤ 120 karakter | Ham SQLite hatasının ALTINA, 1–2 satır |
| Fixer loot/debrief satırı | beat başına ≤ 2 kısa cümle | Progressive reveal beat'ine oturur |
| `THE WIRE` paneli | monospace; auto-grow (mimari §6.2) | Uzun UNION/`sqlite_master` sığmalı |

**Frontend'e:** tüm string'ler i18n anahtarına hazır (tek kaynak, İngilizce master). Kullanıcı-etkili
her metin React text-escape ile basılır — `dangerouslySetInnerHTML` YASAK (mimari §9-R1, XSS). Ham
SQLite hata mesajı da text olarak, birebir.

---

## 11. Devir (handoff) — kim neyi doldurur

- **security-analyst (03):** debrief teknik gövdesi (`explanation`, `vulnerableCode`, `secureCode`)
  + tier-2/3 ipucu payload'ları. Benim takeaway sözcüklerimi teknik doğruluk için onayla (§5 notu).
- **data-modeler (05):** loot flag string'leri (Vault gizli hesap değeri, Blueprint blueprint flag'i)
  YALNIZCA hedef tabloda seed'lensin; loot-reveal copy'm o değeri *sunar* ama değeri 05 verir.
  `appName`'leri (`Meridian — Staff Portal` / `Meridian Market` / `Meridian Press`) seed bağlamıyla
  hizala. Blueprint gizli tablo adı tahmin-edilemez kalsın (keşif zorunlu — brief buna güveniyor).
- **designer (04):** §7 microcopy + §10 limitler; `THE WIRE` şeffaflık paneli; debrief iki-kolon
  (attack↔fix); "Call the Fixer" 3-slot tepsi; THE BOARD hub.
- **planner (02):** §9 rütbe eşiklerini `scoring` bağlamında kesinleştir (adlar benden).
- **babel / i18n-expert (lokalizasyon istenirse):** ses rehberi (§3,§6) porte edilir; İngilizce master
  anahtarlardan çeviri. Noir tonu hedef dilde yeniden *kurulmalı*, birebir çevrilmemeli.

---

## 12. SEO notu (landing — hafif dokunuş)

Client-side statik oyun; landing tek SEO yüzeyi. Content-strategist önerisi:
> GAME COPY — meta
> - `<title>`: `SQL Heist — Learn SQL Injection by Pulling It Off`
> - meta description (≤155 char): `A noir heist game that teaches SQL injection against a real
>   in-browser SQLite engine — then teaches you to defend it. Three jobs. No setup.`
> - Anahtar niyet: *learn sql injection*, *sql injection game / practice*, *parameterized queries*,
>   *appsec training*, *CTF*.
> - OG başlık/desc landing headline'ıyla aynı (§8) — tutarlı ses.

---

## 13. Alan → şema eşlemesi (özet — 01 §4)

| Şema alanı | Bu dokümanda | Kim doğrular |
|------------|--------------|--------------|
| `brief.handler` | `The Fixer` (§4) | — |
| `brief.text` / `brief.objective` | §4 game-ready | — |
| `target.appName` | §4 (`Meridian …`) | 05 (seed bağlamı) |
| `target.fields[].label/placeholder` | §4 microcopy | 01 (name = token) |
| `debrief.*` (metin gövde) | çerçeve §5 | **03 (doğruluk)** |
| `debrief.takeaway` | §5 (sözcükler benim) | **03 (teknik onay)** |
| `hints[]` tier-1 body | §4 nudge'lar | 02 (yapı) |
| `hints[]` tier-2/3 body | — | **03 (payload)** |
| loot flag (sunum copy'si) | §4 loot-reveal | **05 (değer)** |
| rütbe adları | §9 | 02 (eşik) |

---

## Değişiklik günlüğü
| Sürüm | Tarih | Değişiklik |
|-------|-------|-----------|
| v0.1 | 2026-07-29 | İlk taslak (Gate 2 copywriter). Yay hikâyesi, The Fixer sesi, 3 job brief + loot/debrief çerçeve copy, ton do/don't, microcopy kütüphanesi, onboarding, rütbe, designer/03/05 devri. |
