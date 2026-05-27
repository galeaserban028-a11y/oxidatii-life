
# OXIDAȚII — Pivot la aplicație reală, mobile-first, balcanică

Trecem de la landing-page cinematic la **app real, multi-pagină, mobile-first**, cu conturi reale, date reale, foto proof care chiar merge, locație reală (cu consimțământ) și harta întregii Românii cu cluburi & străzi reale.

---

## 1. Backend (Lovable Cloud — activat acum)

Activez Cloud și creez schema:

- `profiles` — handle (@nume), city, avatar, bio, rank, aură, total șprițuri lifetime
- `cities` (16 orașe RO seeded) — name, slug, lat/lng, chaos_level
- `streets` (~6-10 străzi reale per oraș, seeded) — name, city_id, slug
- `venues` (cluburi/baruri reale per stradă) — name, street_id, type (club/bar/terasă/after), description, cover_photo, ig_handle, lat/lng
- `venue_photos` — venue_id, user_id, photo_url, caption, taken_at (user-uploaded "poze de aseară")
- `sprit_proofs` — user_id, venue_id, photo_url, ai_verified (bool), ai_reason, created_at — fiecare șpriț scanat cu poză
- `check_ins` — user_id, venue_id, lat/lng, created_at (cine-i acum unde)
- `ranks` (config) — balkan ranks pe trepte

RLS strict: doar user-ul își poate șterge poza/proof-ul; read public pentru venues/streets/cities; check-ins se văd doar live (ultimele 4h) și anonimizat dacă user-ul vrea.

Storage bucket: `proofs/`, `venue-photos/`, `avatars/`.

## 2. Auth real

- Email + parolă **și** Google sign-in (default Lovable Cloud)
- Pagină `/onboarding` după signup: alege handle, oraș, avatar, accept ToS, **opțional** permisiune locație
- Trigger DB → creează profile automat
- `/login`, `/signup`, `/reset-password`

## 3. Rangurile balcanice (înlocuiesc GOD/ASCENDING)

Ordinea (de jos în sus):
1. **MDS** — sub 3 șprițuri / săptămână
2. **Crai de cartier**
3. **Șprițarul**
4. **Cămătaru' de Pahar**
5. **Boierul Nopții**
6. **Regele Centrului**
7. **ZEU' Balcanic** — locul 1 național al zilei

Locul 1 din top zilnic primește titlul "ZEU' de azi" cu coroană 👑.

## 4. Pagini (multi-page, mobile-first)

```
/                     Landing public (păstrăm hero cinematic, scurtat)
/login  /signup       Auth
/onboarding           Setup profil + locație consent
/app                  Tab bar mobil (bottom nav: Hartă · Top · Scanează · Squad · Profil)
  /app/map            Harta României (zoom: țară → oraș → stradă)
  /app/city/$slug     Pagina orașului: străzi active, top șprițari local
  /app/street/$id     Lista cluburilor de pe stradă cu poze
  /app/venue/$id      Pagina clubului: cover, descriere, IG, ultimele poze user, "cine-i aici acum"
  /app/scan           Scanează șpriț (cameră → upload → AI verifică)
  /app/top            Leaderboard național (Zi/Săptămână/All time) + filtrare per oraș
  /app/profile/$h     Profil public: rank, total, poze, istoric
  /app/me             Profilul tău + setări (locație, notificări, logout)
```

## 5. Harta — refacere completă

- SVG real al conturului României (path precis, nu aproximativ)
- Zoom semantic: țară → oraș (tap pin) → stradă (tap stradă) → club
- Cluster pins (oraș mic = punct mic, București/Cluj = punct mare pulsând)
- Heatmap real bazat pe check-ins din ultima oră
- Filtre: "Unde-s MDS-uri multe?" (densitate check-ins), "Doar cluburi", "Doar afters", "Open now"
- Pe mobil: drag/pinch zoom; pe desktop: scroll-zoom
- Geolocație user (cu consimțământ): "ești la 230m de @club_x"

## 6. Șpriț Scan — proof real

Flow:
1. User dă tap pe "Scanează" → cameră se deschide (`<input type="file" capture="environment">`)
2. Poza + locația GPS (dacă a dat permisiunea) urcate în storage
3. Server function trimite poza la Lovable AI Gateway (Gemini vision) cu prompt: "Vezi un pahar de șpriț (vin alb + sifon, pahar înalt, bule)? Răspunde JSON: {is_sprit, confidence, reason}"
4. Dacă `is_sprit && confidence > 0.7` și user-ul e geo-aproape de un venue → +1 proof, +aură, posibil rank-up
5. Anti-cheat: cooldown 8 min între scan-uri, max 30/zi, EXIF check, ban 30 zile pt fraudă

## 7. Pagina cluburilor (la cererea ta)

Tap Arad → tap "Bd. Revoluției" → listă cluburi reale cu cover photo + nume + tip + ⭐ + cine-i activ acum.
Tap club → galerie foto (user-uploaded "aseară aici"), descriere, IG, "scanează șpriț aici", buton "merg aici acum".

## 8. Proporții & design

- Mobile-first (preview pe 390×844)
- Bottom tab bar fix (5 iconițe)
- Spacing consistent (Tailwind v4 tokens), tipografie redusă pe paginile interne (hero cinematic doar pe landing)
- Card-uri venue: cover 16:9, padding aerisit
- Harta: full-bleed mobil, ratio fix desktop

## 9. Seed data (real, nu fake)

Seed manual cu date verificabile pentru pornire:
- 16 orașe cu coordonate reale
- 6-10 străzi reale per oraș (Calea Victoriei, Lipscani, Bd. Revoluției Arad, Piața Unirii Cluj, etc.)
- 3-8 venues reale per stradă-cheie (ex: Control, Eden, Form Space, Janis pt București; Form, Janis Cluj etc.) cu IG handles
- Restul se completează organic pe măsură ce userii scanează și check-in-uiesc

---

## Fazare propusă (livrăm pe pași, nu totul într-un turn)

**Faza 1 — Fundație (acum):** activare Cloud, schemă DB completă, RLS, seed orașe+străzi+venues, auth (email + Google), `/onboarding`, layout `/app` cu bottom tab bar mobil. Fix hidratare la harta veche.

**Faza 2 — Harta & navigare reală:** harta SVG nouă a României, paginile city/street/venue cu date reale din DB, geolocație consent.

**Faza 3 — Șpriț Scan real:** cameră, upload storage, AI verify Gemini vision, anti-cheat, +aură, rank-up.

**Faza 4 — Social live:** check-ins live, poze venue user-uploaded, top național/local dinamic cu rangurile balcanice, profile publice.

**Faza 5 — Polish:** notificări push, share story, friend system, squad mechanics reale.

---

## Tehnic (pentru referință)

- TanStack Start, server functions cu `requireSupabaseAuth`
- Lovable AI Gateway (`google/gemini-3-flash-preview` text, `google/gemini-3.1-flash-image-preview` pentru vision pe șpriț)
- Storage Supabase pt poze, RLS pe bucket
- Geolocație: `navigator.geolocation` cu prompt explicit + toggle în setări
- Mobile-first: `preview_ui--set_preview_device_viewport` mobil; design la 390px

---

**Întrebare înainte de start:**
Confirmi Faza 1 acum (Cloud + schemă + auth + seed + tab bar) ca să avem o fundație reală peste care construim restul? Sau preferi să încep direct cu harta nouă a României și pe urmă auth?
