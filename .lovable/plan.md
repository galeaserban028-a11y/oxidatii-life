# 🍸 Sistem de promovare business — plan complet

Înlocuim totul din zona „business / promovare" cu un ecosistem premium tip *TikTok Ads + Google Maps Promoted + Instagram Business*, adaptat pentru nightlife. Mai jos e arhitectura completă: tieruri, UI, logica de ranking, dashboard, revenue, anti-spam.

---

## 1. Tieruri (4 planuri)

| Tier | Preț/lună | Vizibilitate | Feed | Hartă | Search boost | Events | Analytics | Branding |
|---|---|---|---|---|---|---|---|---|
| **Starter** | **500 RON** (~€100) | Local (oraș) | 1 post sponsorizat / săpt. | Marker standard cu glow subtil | ×1.3 | 1 event activ | Basic (views, clicks) | Logo + culoare |
| **Popular** | **1.000 RON** (~€200) | Top 10 în search local | 3 posts sponsorizate / săpt. + Stories | Marker mediu, halo pulsatoriu | ×2 | 3 events / săpt. | + demografice & heatmap | + cover, galerie, link |
| **Elite** | **2.000 RON** (~€400) | „Featured Tonight" eligibil | Posts nelimitate + Reels | Marker mare, animat, pin 3D | ×3.5 | Nelimitat + push notif. | + conversii, retention, A/B | + temă custom, badge ⭐ |
| **Exclusive Partner** 👑 | **5.000 RON** (~€1000) | Max 3 / oraș, locked slot | Top feed garantat + takeover | Pin signature animat, ring exclusiv | ×5 + always top 3 | + co-branded city events | + ROI projections, exporturi | + homepage hero, early access |

**Scarcity Exclusive Partner**: maxim 3 sloturi / oraș. Când sunt ocupate → waitlist publică cu countdown.

---

## 2. Map-first (psihologie click)

- **Glow tier-based**: oklch glow în culoarea tier-ului (gold pentru Exclusive, magenta pentru Elite).
- **Live energy ring**: cerc pulsatoriu cu intensitate = check-ins ultima oră.
- **Hover preview card**: photo + „🔥 142 inside now" + next event.
- **Animation cadence**: doar Elite+ au animație continuă, restul doar pulse la 8s (anti-spam vizual).
- **Honest labels**: badge `Sponsored` mic dar mereu vizibil → încredere.

**De ce dă click**: FOMO (live count), social proof (people-now), curiozitate (preview), reward anticipat (offer attached).

---

## 3. Feed integration

Tipuri conținut business:
- **Photo / Video post** (apare în feed cu tag `Sponsored • Venue`)
- **Story** (în stories strip, ring auriu)
- **Event card** (cu RSVP button → join party)
- **Limited offer** (countdown + claim button → cod în wallet)

Mecanici engagement reciproc:
- 👍 Like, 💬 Comment, 🔁 Repost, 🔖 Save, 🎟️ Attend
- Reposts dau XP utilizatorului → motivează share organic.

Anti-spam: max 1 sponsored la fiecare 6 posturi organice în feed.

---

## 4. 🔥 Featured Tonight

Secțiune sticky pe `/app` și `/app/discover`:
- Carousel orizontal cu cele mai active venue-uri promovate (Elite + Exclusive)
- Pentru fiecare: cover video loop, **energy meter** (🔥🔥🔥), attendance estimate (`~230 inside`), next event countdown.
- Reordering la fiecare 15 min după algoritm live (vezi §5).
- Max 8 carduri, refresh transparent.

---

## 5. Algoritm ranking (search + featured)

```
score = (promotion_weight × 0.30)
      + (rating_norm     × 0.20)
      + (popularity_7d   × 0.20)
      + (distance_decay  × 0.15)
      + (event_activity  × 0.15)
```

- `promotion_weight`: Starter 1.3 / Popular 2 / Elite 3.5 / Exclusive 5
- `rating_norm`: rating mediu / 5 (min 20 review-uri ca să conteze full)
- `popularity_7d`: check-ins ultimele 7 zile, normalizate pe oraș
- `distance_decay`: `exp(-km/3)`
- `event_activity`: events active / 24h

**Fair clause**: un venue cu rating < 3.5 sau cu >3 reports active **nu poate intra Featured Tonight**, indiferent de plată.

---

## 6. Business Dashboard (`/app/biz`)

Reset total. Secțiuni:
1. **Hero** — nume venue, tier badge, ROI estimat luna curentă, „Upgrade" CTA.
2. **Live now** — vizitatori activi, story views, evente live.
3. **KPI grid (7d / 30d / custom)** — profile views, map clicks, event joins, conversion rate, avg dwell.
4. **Audience** — vârstă, gender, oraș, oră peak (chart-uri Recharts).
5. **Content performance** — top posts, top stories, top offers (cu CTR & saves).
6. **Campaigns** — listă campanii active + buton „Launch campaign".
7. **Offers** — manage offers + redemption counter.
8. **Wallet & invoice** — sold, top-up, istoric facturi.
9. **Exclusive program** — dacă disponibil, banner cu slot status pentru oraș.

---

## 7. Revenue & growth

**Projection conservativ** (12 luni, RO):
- Lună 1-3: 30 venue Starter + 8 Popular → ~23k RON MRR
- Lună 6: 80 Starter + 25 Popular + 8 Elite → ~71k RON MRR
- Lună 12: 150 Starter + 60 Popular + 20 Elite + 6 Exclusive → **205k RON MRR**

Growth:
- Free 14-day trial Starter pentru venue-uri verificate.
- „City launch" package: primele 5 venue dintr-un oraș nou primesc 50% off 3 luni.
- Refer-a-venue: -10% / lună pentru fiecare venue activ adus.

---

## 8. Anti-spam & trust

- Max 1 sponsored la 6 posturi organice.
- Sponsored content trece prin moderation queue (admin) înainte de live dacă e Starter; Popular+ auto-approve cu post-moderation.
- Offers cu „prea bine ca să fie adevărat" (>80% reducere) flag automat.
- Reports >3 într-o săpt. → tier suspendat 48h, refund pro-rata.
- Rating mediu <3.0 → pierde Featured Tonight + Exclusive eligibility.

---

## 9. Implementare tehnică

### Schemă DB (migrație nouă)
- `business_tiers` (enum): `starter | popular | elite | exclusive`
- `business_accounts`: adăugăm `tier`, `tier_renews_at`, `tier_started_at`, `monthly_price_cents`, `is_exclusive_slot`, `exclusive_city_id`, `featured_score` (cached), `live_energy` (int).
- `business_campaigns` (refactor `campaigns`): tipuri `feed_post | story | event | offer | takeover`, `tier_required`, `impressions`, `clicks`, `conversions`, `spend_cents`, `status`.
- `business_metrics_daily`: `business_id, date, profile_views, map_clicks, story_views, event_joins, offer_claims, unique_visitors`.
- `exclusive_partner_slots`: `city_id, slot_index (1..3), business_id, locked_until`.
- RPC: `compute_business_score(business_id)`, `claim_exclusive_slot(city_id)`, `get_featured_tonight(city_id)`.

### Cod (înlocuim TOT ce e business/promo)
**Șterse:**
- `src/components/biz/BizCommandCenter.tsx` (rewrite complet)
- `src/routes/app.biz.tsx` (rewrite)
- `src/routes/app.promo.$id.tsx` → devine `/app/biz/campaigns/$id`
- `src/components/app/SponsoredFazaCard.tsx`, `PromoTakeover.tsx` → înlocuite cu noi variante tier-aware

**Noi fișiere:**
```
src/routes/
  app.biz.tsx                      (dashboard hero + nav)
  app.biz.analytics.tsx            (KPI + audience)
  app.biz.content.tsx              (posts/stories/offers manager)
  app.biz.campaigns.tsx            (campaign launcher + listă)
  app.biz.campaigns.$id.tsx        (detail + edit + metrics)
  app.biz.plans.tsx                (4 tiers cu compare + checkout)
  app.biz.exclusive.tsx            (Exclusive Partner program + slots)
  app.biz.wallet.tsx               (sold, top-up, facturi)
  app.biz.events.tsx               (event manager)

src/components/biz/
  TierBadge.tsx
  TierCard.tsx                     (pricing card)
  TierCompareTable.tsx
  KpiGrid.tsx
  AudienceChart.tsx
  LiveEnergyMeter.tsx
  CampaignComposer.tsx
  OfferComposer.tsx
  ExclusiveSlotCard.tsx
  FeaturedTonightAdmin.tsx
  BizSidebar.tsx                   (left nav pe desktop)

src/components/app/
  FeaturedTonightStrip.tsx         (carousel public în /app)
  SponsoredVenueCard.tsx           (tier-aware, cu glow)
  SponsoredOfferCard.tsx
  TierGlowMarker.tsx               (folosit pe hartă)

src/lib/biz/
  tiers.ts                         (constante + weights + features)
  rankingScore.ts
  featuredTonight.ts
  campaigns.functions.ts           (createServerFn pentru launch/pause/metrics)
```

### Plată
Folosim Stripe (deja integrat). Creăm 4 produse recurente lunare (500/1000/2000/5000 RON) + un produs „Exclusive Partner Deposit" (one-time 2000 RON). Webhook updatează `business_accounts.tier`.

### Design system
- Tier colors în `src/styles.css`:
  - `--tier-starter`, `--tier-popular`, `--tier-elite`, `--tier-exclusive` (gold oklch)
  - `--glow-elite`, `--glow-exclusive` (box-shadow tokens)
- Font display: păstrăm existentul; tier badges folosesc uppercase + tracking.

---

## 10. Ordine de execuție

1. Migrare DB (schemă + RPC + GRANT-uri + RLS).
2. Stripe products (4 tier + deposit).
3. `src/lib/biz/tiers.ts` + design tokens.
4. Înlocuire `/app/biz` cu noul shell + sidebar + dashboard.
5. Rute noi: plans, analytics, campaigns, exclusive, wallet, content, events.
6. Featured Tonight strip + integrare în `/app` feed și `/app/discover`.
7. Markeri hartă tier-aware în `/app/map`.
8. Refactor `SponsoredFazaCard` → tier-aware în feed.
9. Algoritm ranking în search/discover.
10. Anti-spam guards + admin moderation queue în `app.admin.campaigns`.
11. QA: build, RLS, flux complet upgrade tier + launch campanie.

---

⚠️ **Atenție scope**: e o reconstrucție mare (≈25-30 fișiere noi, 1 migrație complexă, 4 produse Stripe). Va consuma credits semnificativ. Aprobă planul și pornesc cu migrarea DB ca prim pas.
