## Ce livrez

Un raport scris în română, salvat ca `/mnt/documents/oxidatii-revizie.md` (deschidere imediată în chat), cu **5 capitole**. Fără modificări de cod în această rundă — doar diagnostic + recomandări.

## Structura raportului

### 1. Verdict pe scurt (1 pagină)
- Ce e deja unic față de Snap Map / Untappd / Partiful (proof-of-night, spritz index, harta neon, squad-first DM)
- 3 capcane majore (ex: feature creep admin, ecrane care arată ca un Untappd cu skin neon, lipsă "moment-hero" pe care să-l postezi)
- Verdict: unde stăm pe scala "yet another social" → "categorie nouă"

### 2. Audit ecran-cu-ecran (partea grea)
Pentru fiecare rută importantă: claritate, ierarhie, motion, friction, ce să tai / ce să amplifici. Acoper:

- **Onboarding + auth** — primul minut decide totul
- **`/app` (feed)** — primul ecran după login
- **`/app/map`** — eroul produsului (neon, prieteni, venues)
- **`/app/squad`** + **`/app/parties`** — proaspăt redesigned, verific consistența
- **`/app/inbox` + `/app/chat`** — DM, grupuri
- **`/app/spritz-index` + `/app/scan`** — mecanica proof-of-night
- **`/app/top` + `/app/faze`** — leaderboard / momente
- **`/app/me` + `/app/me_.reputation`** — profil, reputație
- **`/app/discover` + `/app/city/$slug` + `/app/venue/$id`** — descoperire localuri
- **`/app/premium` + `/app/shop`** — monetizare
- **`/app/notifications` + `/app/settings`** — igienă
- **Admin & biz** (scurt) — doar dacă blochează experiența user-ului

Fiecare ecran primește: ✅ ce merge · ⚠️ ce strică flow-ul · 🔧 fix concret (S/M/L effort).

### 3. Performanță & PWA
- FPS hartă (markeri, halouri, blur), tile cache, raster fallback
- Bundle size pe rută (rute >500 linii: `me`, `parties`, `premium`, `settings`, `squad`, `user`)
- Service worker: kill-switch funcționează? caching corect pe HTML?
- Imagini (avatare, venue photos) — webp/avif, lazy, srcset
- Realtime: câte canale supabase deschidem simultan, leak-uri pe unmount
- LCP / TTI estimate pe `/app` și `/app/map`

### 4. Funcționalități noi — 12 idei diferențiatoare
Filtrate pe axa "doar OXIDAȚII poate face asta", grupate pe 3 piloni:

**A. Proof-of-night dur (vs Untappd)**
- "Night Verdict" — la 9 dimineața primești un card auto-generat cu noaptea ta (loc, gașcă, spritz consumați, traseu pe hartă) → unul singur, shareable pe IG story
- "Streak fragil" — pierzi streak-ul dacă nu ești la un local cu cel puțin 1 prieten în 7 zile (forțează ieșitul împreună, nu solo check-in)
- "Spritz Forensics" — fiecare proof primește un scor (foto + locație + ora + martori prezenți) → reputație ne-trișabilă

**B. Squad-first social (vs BeReal)**
- "Trupa Vede Live" — doar trupa ta vede unde ești în timp real, restul văd doar dimineața. Anti-stalker prin design.
- "Decision Mode" — buton mare în chat "unde mergem?" → votare cu localuri din apropiere, top 3, gașca decide în <2min
- "Ghost Hours" — între 04:00–10:00 toate pozele se blurează automat pentru cei din afara squad-ului (regret-proofing)

**C. Discovery cu autoritate locală (vs Partiful/Eventbrite)**
- "Heat Now" — hartă cu pulse real-time (cine e la ce local ACUM, doar friends-of-friends) → înlocuiește "trending"
- "Locul Lunii pe Stradă" — micro-leaderboard per stradă (nu per oraș), forțează descoperire hyper-local
- "Verdictul Trupei" — un local nu primește rating de la individ, ci de la grupul care a fost împreună (mai greu de trișat, mai relevant)

**D. Format-uri media native pentru noapte**
- "Audio Proof 10s" — în loc de poză, înregistrare ambientală de 10s (zgomot bar, muzică) → mult mai intim, mai greu de fake
- "Boomerang Spritz" — format video specific pentru clink-ul de pahar, 1 buton, auto-share
- "Morning Mosaic" — colaj automat din toate proof-urile squad-ului din noaptea trecută, livrat ca single image shareable

Fiecare idee primește: effort estimate (S/M/L), risc (low/med/high), de ce e defensibil.

### 5. Roadmap propus (opțional — doar dacă vrei)
Ordonare quick-wins → big bets, cu dependențe.

## Cum lucrez

- Citesc rutele și componentele relevante (nu fac modificări)
- Generez raportul ca un singur fișier `.md` în `/mnt/documents`
- Adaug `<presentation-artifact>` ca să-l deschizi cu un click
- La final, întreb dacă vrei să atac top 3 quick-wins imediat (rundă separată în build mode)

## Ce NU includ
- Cod modificat (asta vine după ce aprobi raportul + alegi prioritățile)
- Audit de securitate (separat, scanner-ul are tool propriu)
- Audit SEO (separat)
- Mock-uri vizuale (separat, prin design directions dacă vrei)
