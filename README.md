# OXIDAȚII — Aplicația de șpriț

Aplicație balcanică de nightlife. Hartă live cu cluburi & terase, check‑in la șpriț, top zilnic, feed cu „dovezi de șpriț", chat, notificări push, autentificare, multilingv (RO/EN). +18.

> Stack: **TanStack Start (React 19 + Vite 7)** pe **Cloudflare Workers**, **Tailwind v4**, **Lovable Cloud (Supabase)** pentru DB / Auth / Storage / Realtime, **Lovable AI Gateway** pentru funcții AI.

---

## 1. Demo online

- **Preview (necesită cont Lovable):** https://id-preview--c7d68625-ce68-4035-8023-bc8b4887c4dd.lovable.app
- **Demo public:** apasă **Publish** în editor (colț dreapta‑sus) → va apărea un URL `…lovable.app` accesibil oricui, fără login.
- **Cont demo:** creează‑ți unul direct din `/signup` (email + parolă). 18+ obligatoriu.

Rute publice utile pentru screenshot/demo: `/`, `/login`, `/signup`, `/app`, `/app/map`, `/app/top`, `/app/faze`, `/app/me`.

## 2. Cod organizat

Structura repo‑ului respectă convenția TanStack Start (file‑based routing) + separare clară între prezentare, logică client și logică server.

```
src/
├─ routes/              # File-based routing (TanStack Router)
│  ├─ __root.tsx        # Shell HTML, providers, error & 404 boundaries
│  ├─ index.tsx         # Landing public (/)
│  ├─ login.tsx         # /login, /signup, /onboarding
│  ├─ app.tsx           # Layout autentificat (BottomTabBar + Header)
│  ├─ app.map.tsx       # Harta României cu locații live
│  ├─ app.top.tsx       # Clasament (Top Șprițuri / pe țară)
│  ├─ app.faze.tsx      # Feed cu „dovezi de șpriț"
│  ├─ app.me.tsx        # Profil + reputație
│  ├─ app.chat.$id.tsx  # Chat 1:1 (Realtime)
│  └─ api/              # Server routes (webhooks, /api/public/*)
│
├─ components/
│  ├─ ui/               # shadcn/ui (Button, Dialog, …) — primitivele
│  ├─ app/              # Componente de feature (AppHeader, BottomTabBar,
│  │                    # RomaniaMap, FinderRadar, PromoTakeover, …)
│  ├─ oxidatii/         # Branding (logo, ilustrații)
│  ├─ AgeGate.tsx       # Gate 18+
│  ├─ CookieConsent.tsx # Consimțământ cookies (GDPR)
│  └─ LegalPage.tsx     # Wrapper pentru Privacy / Cookies / Terms
│
├─ lib/
│  ├─ auth.tsx                  # AuthProvider (Supabase session)
│  ├─ i18n.ts + translations.ts # RO/EN + DomTranslator runtime
│  ├─ chat.ts / follows.ts /…   # Client helpers per feature
│  ├─ *.functions.ts            # createServerFn (RPC tipat client→server)
│  ├─ *.server.ts               # Cod care rulează DOAR pe server (secrete)
│  ├─ error-capture.ts          # Listeners globali pt. SSR errors
│  └─ error-page.ts             # HTML fallback fără dependențe
│
├─ integrations/supabase/       # Client browser + admin + auth middleware
│  (auto-generat — NU se editează manual)
│
├─ hooks/                       # Hook-uri React refolosibile
├─ assets/                      # Imagini importate (logo, fonts locale)
├─ styles.css                   # Tailwind v4 + design tokens (oklch)
├─ router.tsx                   # createRouter + QueryClient context
├─ start.ts                     # createStart + middleware globale
└─ server.ts                    # Wrapper SSR (lazy import + try/catch)

supabase/
├─ migrations/                  # SQL versionat (CREATE TABLE, RLS, policies)
└─ config.toml                  # Config proiect (auto-generat)
```

### Convenții cheie

| Strat | Regulă |
|---|---|
| **Routing** | File‑based: `app.foo.tsx` → `/app/foo`. Pentru sub‑rute folosește puncte, nu foldere. |
| **Design tokens** | NU se scrie `bg-black` / `text-white` în componente. Totul prin tokenii semantici din `src/styles.css` (`--background`, `--primary`, `--neon-crimson`, …). |
| **Server logic** | `createServerFn` în `src/lib/*.functions.ts`; secretele citite din `process.env` doar în `.handler()`. |
| **Webhooks / API public** | În `src/routes/api/public/*` cu verificare semnătură. |
| **DB & RLS** | Migrații SQL în `supabase/migrations/`. Fiecare `CREATE TABLE public.*` are `GRANT` + `ENABLE RLS` + `CREATE POLICY`. Rolurile de utilizator stau în `user_roles` separat (anti‑escalare). |
| **i18n** | Toate șirurile RO sunt mapate în `src/lib/translations.ts`; `DomTranslator` aplică EN runtime peste DOM. |
| **Erori** | `errorComponent` + `notFoundComponent` pe `__root`; wrapper `server.ts` capturează erorile SSR pe care h3 le înghite. |

## 3. Documentație clară

### Cum rulezi local

```bash
bun install
bun dev          # http://localhost:8080
```

Variabilele de mediu vin din `.env` (auto‑generat de Lovable Cloud): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Pe server: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`.

### Funcționalități principale

- **Hartă live** (`/app/map`) — locații, „cine bea acum", radar oxidați pe România.
- **Top** (`/app/top`) — clasament șprițuri / lună, selector de țară (RO, MD, BG, RS, GR, IT, ES, DE, FR, UK, US, AT, BE, HU, PT, SE, CZ, DK, FI, NO).
- **Faze** (`/app/faze`) — feed cu „dovezi de șpriț" (foto + caption).
- **Profil & Reputație** (`/app/me`) — streak, scor oxidare, badge‑uri, premium.
- **Chat & Notificări** (`/app/chat/:id`, `/app/notifications`) — Supabase Realtime + Web Push.
- **Admin** (`/app/admin/*`) — moderare locații, raportări, campanii, debug.
- **Multilingv** — buton RO/EN în `Setări`; traducerea se aplică instant în tot DOM‑ul.
- **GDPR ready** — AgeGate 18+, CookieConsent, pagini Privacy / Cookies / Terms.

### Cum se adaugă o pagină nouă

1. Creează `src/routes/app.nume.tsx` cu `createFileRoute("/app/nume")(...)`.
2. Adaugă link în `src/components/app/BottomTabBar.tsx` (dacă e tab).
3. Pentru date din DB: scrie un `createServerFn` în `src/lib/nume.functions.ts` și consumă cu `useServerFn` + `useQuery`.
4. Pentru text nou: adaugă perechea RO→EN în `src/lib/translations.ts`.

### Securitate

- RLS activă pe toate tabelele `public.*`.
- Rolurile (`admin`, `moderator`, `user`) sunt în `user_roles` + funcția `has_role(_user_id, _role)` `SECURITY DEFINER`.
- Secretele nu ajung niciodată în bundle‑ul client (`*.server.ts` blocat de import‑guard).
- AgeGate blochează accesul sub 18 ani.

### Deploy

Apasă **Publish** în editorul Lovable. Frontend → click „Update" pentru a împinge. Backend (migrații, server functions) deploy automat.

---

Made with 🩸 in the Balkans. 18+ • Drink responsibly.
