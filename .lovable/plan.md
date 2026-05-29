# Push notifications

## Ce livrez

Push-uri pentru:
1. **Petrecere nouă în orașul tău** — la INSERT în `parties`, notific oamenii cu `profiles.city_id = party.host city`.
2. **Cineva s-a alăturat petrecerii tale** — la INSERT în `party_joins`, notific `parties.host_id`.
3. **Prieten live pe hartă** — la INSERT în `check_ins`, notific prietenii (`friendships accepted`).
4. **Rivalitate / provocare** — momentan nu există tabel `challenges`. Adaug un tabel minim `challenges` (challenger → challenged, venue, message). Push pentru challenger când e challenged, și invers la accept.

Fiecare tip e opt-in separat în `/app/notifications`.

## Bucățile de implementat

### 1. Bază de date (migrație)
- `push_subscriptions` (user_id, endpoint UNIQUE, p256dh, auth, user_agent, created_at)
- `notification_prefs` (user_id PK, new_party_in_city bool default true, party_join bool default true, friend_live bool default true, challenge bool default true)
- `challenges` (id, challenger_id, challenged_id, venue_id nullable, message, status: pending/accepted/declined, created_at)
- RLS + GRANT pentru toate.

### 2. Secrets (VAPID)
- `VAPID_PUBLIC_KEY` (și expus client-side ca `VITE_VAPID_PUBLIC_KEY`)
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (mailto)

Generez perechea local cu `web-push` și îți cer să le adaugi prin formularul securizat.

### 3. Service worker (`public/push-sw.js`)
- Doar `push` + `notificationclick`. Fără caching, fără offline (evită problemele cu preview iframe).
- Înregistrare guard-ată: nu se înregistrează în iframe / pe domenii `id-preview--` / `lovableproject.com`.

### 4. Client
- `src/lib/push.ts`: `enablePush()`, `disablePush()`, `getPushState()`.
- Component `NotificationSettings` în `/app/profile` (sau o rută nouă `/app/notifications`) cu un toggle master + toggle-uri per tip.
- Banner discret în `/app` care apare o dată după onboarding pentru a oferi activarea.
- Pe iOS: detectează `display-mode: standalone`; dacă nu, afișează „instalează PWA-ul ca să primești notificări".

### 5. Server functions (`createServerFn`)
- `sendPush(userIds, payload)` — server-only, folosește `web-push` cu cheile VAPID, citește subscriptions din DB, curăță endpoint-uri 410/404.
- Triggere apelate din client după mutații (mai simplu și fără edge functions Deno):
  - După `INSERT parties` → `notifyNewPartyInCity(partyId)`
  - După `INSERT party_joins` → `notifyPartyJoin(joinId)`
  - După `INSERT check_ins` → `notifyFriendsLive(checkInId)`
  - După `INSERT challenges` → `notifyChallenge(challengeId)`
- Fiecare verifică `notification_prefs` și nu trimite la `user_id` egal cu actor.

### 6. UI rivalități (minim)
- Buton „provoacă" pe profil user (`/app/user/$id`) → modal cu mesaj + optional venue → INSERT în `challenges`.
- Listă „provocări" în `/app/notifications` cu accept/decline.

## Out of scope (pentru acum)
- Bandă largă de cache offline / strategii Workbox.
- Trimitere prin cron / DB triggers (folosesc client-side calls după mutații; suficient pentru toate cazurile listate).
- Notificări native iOS din App Store (doar web push pe PWA installed, conform alegerii tale).

## Ordine de execuție
1. Migrație DB.
2. Generez VAPID + îți cer să adaugi secrets.
3. Service worker + client lib + UI opt-in.
4. Server fn `sendPush` + 4 trigger fn-uri.
5. Wire-up în AddPartySheet, party-join, check-in, challenges modal.

Confirmi planul și pornesc cu migrația?
