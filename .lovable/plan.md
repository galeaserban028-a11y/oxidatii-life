
# Reorganizare șpriț vs postare + ce mai lipsește

## Partea 1 — Ciclul de viață: șpriț vs postare

### Cum e acum
- `/app` (acasă): ambele dispar după 12h ✓ (deja merge)
- `/app/faze`: arată **toate** postările vreodată, fără filtru de timp
- Profil (`/app/me`, `/app/user/$id`): arată **toate** șprițurile + postările forever, amestecate
- Job-ul de curățenie (`cleanup_old_spritz`) deja șterge `venue_photos` mai vechi de 12h, dar **păstrează** `sprit_proofs` (comentariu: "pentru leaderboard")

### Cum va deveni

**Postări (`venue_photos`)** = conținut permanent, ca pe Instagram
- Acasă: dispar din feed după 12h (rămâne)
- Profil: rămân pentru totdeauna într-un tab **"Postări"**
- FAZE (vezi mai jos): vizibile tot weekend-ul curent

**Șprițuri (`sprit_proofs`)** = ephemeral cu istoric privat
- Acasă: dispar din feed după 12h (rămâne)
- FAZE: nu apar deloc (FAZE = doar postări)
- Profil: dispar de pe profilul public după 12h, dar apar într-un tab **"Șprițuri"** vizibil **doar ție** (istoric personal pentru tine — vezi câte ai băut, unde, când)
- Leaderboard-ul continuă să le numere normal (rândurile rămân în DB)

**Pagina FAZE = ce s-a întâmplat în weekend-ul curent**
- Fereastră: de vineri 18:00 (ora Bucureștiului) până luni 06:00, când se acordă premiul săptămânal
- Între luni 06:00 și vineri 18:00 FAZE arată "weekend-ul anterior" (read-only) + countdown la următorul weekend
- Numerele de like/comment de pe FAZE alimentează clasamentul săptămânal → cine câștigă premiul

## Partea 2 — Ce lipsește (alese de tine: revenire zilnică + descoperire + recompense + conexiuni)

Patru sisteme mici care se hrănesc reciproc:

### A. "Diseară" — motiv să intri zilnic (19:00–02:00)
- Card mare pe acasă, sus, apare după ora 18:00: **"Diseară unde ieși?"**
- Tap → alegi un local sau scrii "încă nu știu" → te bagă în lista "cine iese diseară"
- Vezi câți prieteni au pus aceeași locație → presiune socială sănătoasă să confirmi
- La 19:00 primești o notificare: "X prieteni ies diseară la Y locuri. Vezi unde."
- Streak zilnic separat de streak-ul de weekend: aprinzi flacăra dacă faci check-in / postare / votezi "diseară"

### B. Descoperire locuri — "Pulse" pe hartă
- Pe `/app/map` adăugăm un toggle "Pulse" care colorează venue-urile după activitatea ultimelor 2h (heatmap din `get_spritz_index`)
- Card nou pe acasă: **"Locuri noi în orașul tău"** — venue-uri create în ultimele 14 zile cu cel puțin 3 check-in-uri
- "Pentru tine" — recomandări pe baza vibe-ului: dacă mergi des la baruri cocktail, sugerez baruri cocktail unde nu ai fost încă

### C. Recompense pentru postare (folosind sistemul `coin_balance` existent)
- Prima postare a serii: **+5 șprițuri** (coin-uri)
- Postare cu video (nu doar foto): **+3 bonus**
- Dacă postarea ta strânge >10 like-uri în 12h: **+10 șprițuri** + badge "Faza serii" pe profil
- Primul care raportează un venue nou: **+20 șprițuri** + badge "Pionier" permanent
- Toate intră în `wallet_ledger` cu `kind='earn_post'` etc.

### D. Conexiuni între utilizatori
- **"Cine mai e aici acum"** pe pagina de venue: avatare ale userilor cu check-in activ (ultimele 2h), respectă setările existente de map_visibility
- **Reacții rapide** pe FAZE/feed: pe lângă like, 3 emoji rapide (🔥 😂 🍹) — non-intruziv, contează tot pentru clasament
- **Sugestii prieteni**: "X persoane au fost la 3+ locuri comune cu tine" pe `/app/friends`
- **Mesaj rapid din feed**: butonul "Mă bag și eu" pe postare → deschide DM cu textul pre-completat "văd că ești la {venue}, vin și eu"

---

## Plan tehnic

### Migrație (schema)
1. Adaug `cleanup_old_spritz` să **NU** mai șteargă `venue_photos` (le păstrăm pe profil). În schimb adăugăm o coloană `hidden_from_feed_at timestamptz` setată la `created_at + 12h` ca să filtrăm rapid în feed fără să pierdem datele.
   - Alternativ mai simplu: pur și simplu filtrăm în query-uri cu `created_at > now() - interval '12 hours'` pe feed-uri (acasă) și fără filtru pe profil — fără migrație. Voi merge pe asta.
2. Adaug funcție `current_weekend_window()` care întoarce `(start_at, end_at)` pe baza now() Bucharest: vineri 18:00 → luni 06:00 al weekend-ului curent sau viitor.
3. Adaug tabel `daily_intents` (user_id, intent_date unique, venue_id, note, created_at) — pentru cardul "Diseară". GRANT + RLS standard.
4. Adaug tabel `venue_reports` (cine a raportat primul un venue) sau folosesc `venues.created_by` existent dacă există.
5. Adaug funcție `award_post_coins(_photo_id)` invocată de un trigger AFTER INSERT pe `venue_photos`.

### Frontend
- `src/routes/app.index.tsx` — adaug cardul "Diseară" (apare după 18:00), cardul "Locuri noi", folosesc fereastra de 12h existentă.
- `src/routes/app.faze.tsx` — filtrez `venue_photos` la fereastra de weekend din `current_weekend_window()`; ascund `sprit_proofs`; adaug countdown la premiu; banner cu top 3 din clasament live.
- `src/routes/app.me.tsx` — împart într-un mic tab-bar **Postări** | **Șprițuri (privat)** | **Salvate** (dacă există). Șprițurile sunt vizibile doar dacă `userId === auth.uid()`.
- `src/routes/app.user.$id.tsx` — pe profilul altui user: NU mai arăt deloc șprițuri; doar tab "Postări".
- `src/routes/app.map.tsx` — toggle "Pulse" cu heatmap pe venue-uri.
- `src/components/app/VenuePresence.tsx` (nou) — "cine e aici acum".
- `src/components/app/QuickReactions.tsx` (nou) — 🔥 😂 🍹 pe carduri.

### Estimare
~6-8 fișiere editate, 2-3 fișiere noi, 1 migrație. Implementez tot într-o singură rundă; nu sunt decizii de UI care necesită design directions — totul folosește componente și stilul existente.

---

## Întrebări rămase (le rezolv inline dacă nu răspunzi)
- Dacă **nu** răspunzi, presupun: fereastra weekend = Vineri 18:00 → Luni 06:00 Bucharest; premiul săptămânal se acordă luni 06:00; recompensele de coins folosesc valorile de mai sus; tab-ul "Șprițuri" pe profil e strict privat (nimeni altcineva nu îl vede).
