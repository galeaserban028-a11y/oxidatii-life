# Heat Now + Decision Mode

Două features noi, livrate împreună pentru că împart aceleași semnale (check-ins, photos, Spritz Index).

## 1. Heat Now — hotspot live pe hartă

**Backend**

- RPC nouă `get_heat_now(_city_id uuid, _bbox jsonb)` care întoarce zone agregate: lat/lng centroid, radius, `heat_score` (0–100), `trend` (`rising` | `flat` | `cooling`), top 1–2 venues, count check-ins/photos din ultimele 90 min.
- Agregare prin grid simplu (~250m) peste `check_ins` + `venue_photos` din ultimele 90 min, ponderat cu `parties` active. Reutilizează formula din `get_spritz_index`, dar pe celulă.
- Grant `EXECUTE TO authenticated`.

**Frontend** (`src/components/app/RomaniaMap3D.tsx` + `src/routes/app.map.tsx`)

- Toggle „🔥 Heat Now" lângă controalele existente, persistat în localStorage.
- Când activ: heatmap MapLibre (`heatmap` layer) din GeoJSON-ul RPC-ului, refresh la 60s + pe `moveend`.
- Tap pe o zonă fierbinte → bottom sheet cu top venues, score, trend, CTA „Vezi pe hartă".
- Alertă (toast + haptic) când în zona vizibilă apare un hotspot nou cu `heat_score ≥ 75` sau `trend = rising` cu delta ≥ 20 față de poll-ul anterior. Throttled la max 1/3 min.

## 2. Decision Mode — vot rapid în grup

**Backend**

- Tabel `decision_polls`: `id`, `host_id`, `conversation_id` (nullable — direct pe DM/grup), `party_id` (nullable), `expires_at`, `status`, `created_at`.
- Tabel `decision_options`: `id`, `poll_id`, `venue_id`, `source` (`spritz_index` | `manual` | `friend_going`), `score_snapshot`.
- Tabel `decision_votes`: `poll_id`, `user_id`, `option_id`, `created_at` (UNIQUE poll+user).
- RPC `create_decision_poll(_conversation_id, _venue_ids[], _expires_minutes)` care:
  - Generează 3–5 opțiuni: 2 din top Spritz Index pe orașul user-ului, 1–2 unde au check-in prieteni live, restul manual.
  - Postează un mesaj în conversație cu marker `📊 decision:<id>`.
- RPC `cast_decision_vote(_poll_id, _option_id)` + `get_decision_poll(_poll_id)` cu rezultate live.
- RLS: vizibil doar membrilor conversației / host-ului. Realtime publication pe `decision_votes`.

**Frontend**

- `src/components/app/DecisionModeSheet.tsx`: deschis din butonul existent „decide unde mergem" în `app.squad.tsx` și din chat (header chat → icon 📊).
- Pas 1: pickează venues (cu sugestii pre-populate din Spritz Index + prieteni live).
- Pas 2: trimite în chat — apare card vot cu progress-bar per opțiune, countdown.
- Realtime subscribe la `decision_votes` pentru update live.
- La expirare: highlight câștigător + CTA „Creează spritz" (pre-fills `parties` form cu venue-ul votat).

## Detalii tehnice

- Migration unică cu cele 3 tabele + 3 RPC + 1 RPC heat + GRANTs + RLS + adăugare la `supabase_realtime` publication.
- Server fn-uri în `src/lib/heat.functions.ts` și `src/lib/decisions.functions.ts` (cu `requireSupabaseAuth`).
- Polling heat: simplu `setInterval` în componenta map, nu realtime (overhead prea mare).
- Hotspot alert dedup prin `useRef` cu set de `cell_id` deja notificate în sesiune.

## Ce NU includ acum (pot veni iterativ)

- Push notifications pentru hotspots când app-ul e închis.
- Decision Mode cu „swipe Tinder-style" — rămâne vot clasic.
- Heat Now istoric / replay seara — doar live.
