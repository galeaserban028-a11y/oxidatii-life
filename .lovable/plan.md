# Plan: Replay Night + Last Call (monetizare unicat)

Construiesc două features noi, complet funcționale, integrate cu Stripe-ul existent și RLS Supabase.

---

## 1. Replay Night — 9.99 RON

**Ce face:** A doua zi dimineață, userul primește un "wrap" auto-generat din noaptea precedentă (venue-uri vizitate, traseu pe hartă, spritz-uri, prieteni întâlniți, poze) — shareable pe Instagram Stories.

**Cum funcționează:**
- Pagină nouă `/app/replay` care listează nopțile cumpărate
- Buton "Deblochează noaptea de azi (9.99 RON)" → checkout Stripe
- După plată, RPC `grant_replay_unlock(date)` activează acces la datele zilei respective
- Componentă `ReplayCard` agregă: check_ins, party_joins, sprit_proofs, photo_likes din ziua respectivă pentru user_id
- Buton "Share Story" → generează imagine 1080x1920 cu `html-to-image` și descarcă/share-uiește native via Capacitor Share API

**Tabelă nouă:** `replay_unlocks (id, user_id, unlock_date, stripe_session_id, purchased_at)`

---

## 2. Last Call — Ping anonim 2.99 RON + Reveal 4.99 RON

**Ce face:** Trimiți ping anonim cuiva ("Cineva vrea să te vadă diseară 👀"). Destinatarul vede pingul dar nu cine. Poate plăti separat să afle.

**Cum funcționează:**

*Sender flow:*
- Buton "Last Call 🚨" pe profilul oricui (`/app/profile/$id`)
- Modal cu preview + checkout Stripe 2.99 RON
- După plată, RPC `create_last_call_ping(target_id)` inserează în `last_call_pings`
- Push notification către target via `send-push-notification` edge function existentă

*Receiver flow:*
- Pe `/app/inbox` (sau ecran nou `/app/last-calls`) apare card "🚨 Cineva vrea să te vadă diseară"
- Buton "Află cine (4.99 RON)" → checkout Stripe
- După plată, RPC `reveal_last_call(ping_id)` setează `revealed_at` și returnează sender info
- Optimistic UI: după reveal, cardul se transformă în profil clickable

**Tabelă nouă:** `last_call_pings (id, sender_id, target_id, created_at, expires_at, revealed_at, sender_stripe_session_id, reveal_stripe_session_id)`
- Expiră automat în 24h (cleanup cron sau filtru în query)
- RLS: sender vede ce a trimis, target vede primite (cu sender_id ascuns până la reveal)

---

## Stripe Integration

Folosesc infrastructura existentă (`stripe-checkout` edge function + `stripe-webhook`):
- Adaug 3 produse noi în Stripe: `replay_night` (999 RON), `last_call_send` (299 RON), `last_call_reveal` (499 RON)
- Extind `src/lib/premium.functions.ts` cu funcții `purchaseReplay`, `sendLastCall`, `revealLastCall`
- Webhook handler verifică `metadata.type` și apelează RPC-ul corect (`grant_replay_unlock`, `grant_last_call_send`, `grant_last_call_reveal`)

---

## Backend (Supabase)

**Migrare:**
- `CREATE TABLE replay_unlocks` + GRANTs + RLS (owner read only)
- `CREATE TABLE last_call_pings` + GRANTs + RLS (sender_id ascuns prin column-level security; RPC `get_my_last_calls` returnează sender doar dacă `revealed_at IS NOT NULL`)
- RPCs `SECURITY DEFINER`:
  - `grant_replay_unlock(p_user_id, p_date, p_session)`
  - `create_last_call_ping(p_target_id) RETURNS ping_id` (verifică sesiunea stripe activă în webhook)
  - `reveal_last_call(p_ping_id)` (verifică ownership + plată)
  - `get_my_last_calls()` returnează listă cu sender mascat
  - `get_replay_data(p_date)` agregă activitate (doar dacă userul are unlock)

---

## Frontend (rute noi)

```text
src/routes/app.replay.tsx           — listă wrap-uri + checkout
src/routes/app.lastcalls.tsx        — inbox-ul de pinguri primite
src/components/app/ReplayCard.tsx   — render wrap + share
src/components/app/LastCallButton.tsx — buton pe profil
src/components/app/LastCallPingCard.tsx — card primit cu reveal
```

Adaug entry-uri în `BottomTabBar` sau ca shortcut-uri pe `/app/premium`.

---

## Detalii tehnice

- **Share Story**: folosesc `html-to-image` (deja in package?) sau `dom-to-image-more`; pe native folosesc `@capacitor/share` cu fișier temp
- **Anti-abuse Last Call**: rate-limit 5 pinguri/zi/sender via `rate_limits` table existentă
- **Refresh după plată**: la întoarcerea din Stripe, apelez `syncCheckoutToProfile` extins cu logica per-tip
- **Push notification**: refolosesc edge function `send-push-notification` cu payload `{type: 'last_call', target_id}`
- **Confidențialitate**: sender_id NU se trimite niciodată în payload-ul push pentru target

---

## Order of execution

1. Migrare DB (tabele + RPCs + RLS + GRANTs)
2. Stripe products + extensii în `premium.functions.ts` + webhook handler
3. Componente UI (ReplayCard, LastCallButton, LastCallPingCard)
4. Rute noi `/app/replay` și `/app/lastcalls`
5. Entry points (buton pe profil + card pe `/app/premium`)
6. Test build + verificare flow complet

Confirmi să încep? Dau drumul direct la migrare + Stripe.
