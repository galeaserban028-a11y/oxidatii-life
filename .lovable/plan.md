# 🌅 Night Wrapped — "Noaptea ta de aseară"

Card vertical tip Spotify Wrapped cu pozele, locurile, crew-ul din seara precedentă + titlu AI ("Rege la Old Habits", "Hoinar prin Centru", etc). Shareable pe IG story / WhatsApp.

## Ce vede userul

1. Deschide app-ul dimineața → pe `/app`, sus, apare un **card mare animat** "👑 Noaptea ta de aseară e gata" cu un preview blurat.
2. Tap → fullscreen card vertical (story aspect 9:16):
   - **Titlu AI** mare: "Regele de la Old Habits"
   - **Stats**: 4 check-ins · 23 like-uri primite · 2 prieteni noi · 1 party joined
   - **Mini-mosaic** cu 3-4 poze ale tale din seara aia
   - **Crew**: avatare prietenilor cu care ai fost
   - **Locația principală** + ora de vârf
   - Buton **Share** (Web Share API → IG / WhatsApp / download PNG)
3. După ce-l vede o dată → rămâne accesibil în profil → "Nopțile mele".

## Cum funcționează

**Generare lazy + automat:**
- Când userul deschide app-ul după ora 6 AM, frontend-ul verifică dacă există wrap pentru noaptea precedentă (intervalul 18:00 ieri → 06:00 azi).
- Dacă NU există dar are activitate (≥1 check-in / poză / party), apelează server fn `generateNightWrap` care:
  1. Adună activitatea din DB (check-ins, photos, likes primite, prieteni, party joins, ratings).
  2. Trimite la **Lovable AI Gateway** (`google/gemini-3-flash-preview`) cu structured output → primește `{ title, tagline, vibe_emoji }`.
  3. Salvează în `night_wraps` (cached).
- Cron opțional la 8 AM ca să pregenereze pentru userii activi (skip pentru MVP, lazy-gen acoperă).

## Schemă DB

```sql
create table public.night_wraps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  night_date date not null,            -- data nopții (a serii care a început)
  title text not null,                 -- AI: "Regele de la Old Habits"
  tagline text,                        -- AI: "4 locuri, 0 regrete"
  vibe_emoji text,                     -- AI: "👑"
  stats jsonb not null,                -- { check_ins, photos, likes, friends, parties, top_venue }
  photo_urls text[] default '{}',      -- 3-4 poze pentru mozaic
  crew_user_ids uuid[] default '{}',   -- avatare prieteni
  top_venue_id uuid references venues,
  peak_hour int,                       -- ora cu cea mai mare activitate
  created_at timestamptz not null default now(),
  unique(user_id, night_date)
);
```
+ GRANT-uri + RLS (user citește/insert numai pentru `auth.uid() = user_id`).

## Fișiere noi

```
src/lib/night-wrap.functions.ts        -- generateNightWrap (createServerFn + requireSupabaseAuth)
src/lib/night-wrap.server.ts           -- adună date din DB + apel AI Gateway
src/components/app/NightWrapCard.tsx   -- card preview pe /app
src/components/app/NightWrapSheet.tsx  -- fullscreen 9:16 + Share
```

## Modificări

- `src/routes/app.index.tsx`: la mount, dacă user logat și ora > 6 AM, fetch/generate wrap pentru noaptea precedentă; afișează `NightWrapCard` sus dacă există.
- `src/routes/app.me.tsx`: secțiune "Nopțile tale" cu listă wrap-uri istorice (mic, simplu).

## AI prompt (rezumat)

System: "Ești un copywriter pentru o app de nightlife românească (Oxidații). Generezi titluri scurte, mișto, în română colocvială, cu energie de bairam. Max 4 cuvinte titlu, 6 cuvinte tagline."

User payload: `{ check_ins: 4, top_venue: "Old Habits", photos: 7, likes_received: 23, friends_present: ["Mihai", "Ana"], peak_hour: 23 }`

Output structurat (Zod schema): `{ title, tagline, vibe_emoji }`.

## Scope MVP — ce NU facem acum

- ❌ Cron + push notification (lazy-gen e suficient pt MVP; adăugăm cron+push ulterior dacă merge)
- ❌ Export ca imagine reală (PNG) — folosim Web Share API cu screenshot la cerere ulterior; pt MVP, share trimite text + link către wrap-ul public.
- ❌ Pagină publică `/wrap/:id` shareable (poate veni în iterația 2)

## Cost estimat per wrap
1 apel AI Gemini Flash (~$0.0001), 1 insert DB. Negligibil.

---

OK să dau drumul? Încep cu migrarea DB.