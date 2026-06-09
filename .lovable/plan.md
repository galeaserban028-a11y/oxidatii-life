# Setări hartă · Privacy & Visibility

Setările trăiesc într-un sheet nou deschis din butonul „⚙️” pe `/app/map`, lângă chip-ul „live · X oxidați activi”. Tot ce alegi se salvează imediat pe profil și se aplică la următorul ping GPS.

## Ce poate seta userul

1. **Ghost mode** (toggle mare, sus)
   - Off → ești pe hartă normal
   - On → nu mai apari nicăieri, nu mai trimitem `live_locations`. Profil normal, doar pin-ul live dispare. Apare un banner discret „👻 Ești invizibil pe hartă”.

2. **Cine îți vede pin-ul live** (3 opțiuni radio)
   - **Toți prietenii** (default, ca acum)
   - **Doar close friends** — listă curată pe care o gestionezi din setări
   - **Nimeni** (echivalent cu ghost, dar păstrezi check-in-urile vizibile)

3. **Precizie pin** (segment)
   - **Exact** (default) — punctul real
   - **Aproximativ ~200m** — jitter random în jurul punctului, pentru cazurile când vrei „sunt în zonă” fără să-ți vadă adresa
   - **Doar oraș** — pin pe centrul orașului, fără coordonate reale

4. **Auto-ghost după X ore de inactivitate** (slider 1/4/8/12h, default 8h)
   - Dacă nu deschizi aplicația X ore, ștergem `live_locations` automat (deja avem `expires_at`, doar îl scurtăm).

5. **Locații private** (listă)
   - Adaugi venue-uri (acasă, job, sala) — când GPS-ul te plasează în raza lor (~150m), pin-ul tău nu se publică deloc cât timp ești acolo.

6. **Cine te vede pe lista „live”** (toggle)
   - Off → nu mai apari în feed-ul `live · X oxidați activi`, dar prietenii care îți deschid profilul pot vedea ultimul check-in. Bun pentru lurkers.

7. **Lasă-mă să văd doar prietenii care mă văd și pe mine** (toggle reciprocity)
   - On → ascunde de pe harta ta prietenii care te-au pus pe ghost / close friends fără tine. Fair-play simetric.

## Structură UI

```text
/app/map
└─ buton ⚙ (top-right map, lângă chip live)
   └─ <Sheet> "Setări hartă"
      ├─ 👻 Ghost mode                     [switch]
      ├─ Cine te vede live                 [radio: toți / close / nimeni]
      ├─ Precizie pin                      [segment: exact / ~200m / oraș]
      ├─ Auto-ghost după inactivitate      [slider]
      ├─ Locații private                   [listă + buton "+ Adaugă"]
      ├─ Apar în lista "live"              [switch]
      └─ Reciprocitate                     [switch]
```

## Detalii tehnice

- **Migration**: coloane noi pe `profiles`:
  - `map_ghost boolean default false`
  - `map_visibility text default 'friends' check in ('friends','close','nobody')`
  - `map_precision text default 'exact' check in ('exact','approx','city')`
  - `map_auto_ghost_hours int default 8`
  - `map_hide_from_live_list boolean default false`
  - `map_require_reciprocity boolean default false`
  - tabel nou `close_friends (user_id, friend_id, created_at)` cu RLS self-only
  - tabel nou `private_locations (id, user_id, label, lat, lng, radius_m default 150)` cu RLS self-only
- **RLS update** pe `live_locations`:
  - select extins: `are_friends(viewer, owner) AND (map_visibility='friends' OR (map_visibility='close' AND viewer ∈ close_friends(owner))) AND map_ghost=false`
- **Write path** (`app.map.tsx` → `upsert live_locations`):
  - dacă `map_ghost` sau `map_visibility='nobody'` → nu mai facem upsert, ștergem rândul
  - dacă user e în raza unei `private_locations` → idem, skip
  - dacă `map_precision='approx'` → jitter ±0.0018° (≈200m); dacă `='city'` → snap la `city.lat/lng`
  - `expires_at = now() + auto_ghost_hours`
- **Read path** (harta + sheet live):
  - filtrul de `reciprocity` se aplică client-side cu lista de close_friends a userului curent

## Ce las pe dinafară (idei extra pentru altă tură)

- „Apară-mi-se ca alt nume pe hartă” (alias temporar)
- „Time-bombed share” – pin care expiră în 30 min indiferent de setări (gen Snap Map)
- Heatmap anonim al zonelor cu prieteni, fără pin-uri identificabile
- „Cere live” – buton pe profilul unui prieten ghost prin care îi ceri să apară 1h

Spune-mi dacă merg așa, sau dacă vrei să tai/adaugi opțiuni înainte să fac migration-ul + UI-ul.
