# Fac aplicația mult mai smooth

Optimizări țintite pe cele mai frecvente surse de lag din aplicație. Nicio schimbare de design vizibilă — doar fluiditate.

## Ce voi face

### 1. Reduc costul de `backdrop-blur` (163 utilizări în 65 fișiere)
`backdrop-blur` re-eșantionează fiecare pixel de sub element la fiecare frame; peste conținut animat (feed, hartă, reels, storii) e principala sursă de jank pe telefoane mid-range.
- Header-uri sticky, taburi de jos, sheet-uri modale, tooltip-uri → înlocuiesc `backdrop-blur-*` cu fundal semi-opac (`bg-background/95`) + `box-shadow` / `text-shadow` unde e cazul.
- Păstrez blur-ul doar la 1-2 elemente statice unde chiar arată bine (ex. dialog full-screen peste imagine, nu peste video/animație).

### 2. Liste virtuale & rendare grea
- `app.feed`, `app.inbox`, `app.friends`, `app.followers`, `app.chat.$id`, `app.reels`, `app.notifications`: adaug virtualizare pe listele lungi (`@tanstack/react-virtual`) sau paginare cu `IntersectionObserver` unde lipsește.
- `StoriesStrip`, `FeaturedTonightStrip`, `SpritzOfDayStrip`: `content-visibility: auto` + `contain: layout paint` pentru card-uri off-screen.

### 3. Imagini
- Toate `<img>` din feed / lista de venue-uri / stories → `loading="lazy"` + `decoding="async"` + `width`/`height` explicit (previne layout shift).
- Avatarurile mari primesc `fetchpriority="low"` când sunt sub fold.
- Cover-urile mari (venue, promo, wrapped) trec pe `srcset` cu `?w=` unde CDN-ul permite; altfel dimensiune fixă mai mică.

### 4. Animații care rulează în fundal
- Reduc opacitatea/frecvența efectelor decorative (`AvatarAura`, `SignatureReveal`, `ThemeAtmosphere`, `CrystalBallCard`, `StreakHero`) când `getPerfLevel() === "low"` (există deja infrastructura în `src/lib/perfMode.ts`, o folosesc consistent).
- Elimin `filter: drop-shadow` din SVG-uri animate (foarte scump); înlocuiesc cu `box-shadow` sau `text-shadow` pe wrapper.
- Adaug `will-change: transform` doar pe elementele care chiar se animează, și îl scot când animația se termină.

### 5. Re-render-uri React
- `AppLayout`: `resolvePageBackgroundColor` + `MutationObserver` rulează la fiecare navigare — îl mut în spatele unui `requestIdleCallback` și debounce 100ms.
- Rutele grele (`app.map`, `app.faze`, `app.reels`) primesc `React.memo` pe componentele card mari + `useCallback` pe handler-e transmise în listă.
- Query-urile cu `staleTime: 0` implicit primesc `staleTime` explicit (30s–5min) pentru date care nu se schimbă per secundă.

### 6. Scroll & touch
- Pe containere lungi: `overscroll-behavior: contain` ca să nu propage scroll-ul la `body`.
- `PageTransition` folosește tranziții de opacitate/transform pe container mare — verific că nu creează layout thrash și scurtez durata (200→140ms).
- `SwipeNavigator`: pasiv listeners pe `touchmove` acolo unde nu face `preventDefault`.

### 7. Bundle & first paint
- `React.lazy` pe rutele grele care nu se ating imediat (`app.admin.*`, `app.wrapped`, `app.replay*`, `LeaderboardExportSheet`, `NightWrapSheet`).
- Verific că sheet-urile mari sunt încărcate doar când se deschid, nu la mount-ul paginii părinte.

## Ce NU ating
- Design-ul vizual (culori, layout, tipografie) rămâne identic.
- Logica de business, RLS, backend-ul.
- Harta — deja optimizată în tur-ul anterior.

## Verificare
După fiecare grup de modificări:
- Build passes.
- Playwright headless pe `/app`, `/app/feed`, `/app/map`, `/app/reels`: măsor FPS via `performance.now()` pe scroll + screenshot să confirm că nu s-a rupt nimic vizual.
- Verific `getPerfLevel()` se schimbă corect pe device slab (simulez cu CPU throttle 4x).

## Detalii tehnice
- Nu ating `src/integrations/supabase/*`, `src/routeTree.gen.ts`, `capacitor.config.ts`.
- Toate schimbările sunt în `src/components/app/*`, `src/routes/app.*`, `src/lib/perfMode.ts`, `src/hooks/usePerfLevel.ts`.
- Adaug `@tanstack/react-virtual` dacă nu există deja.

Grupul e mare — dacă vrei să tai din scope (ex. doar blur + liste, sau doar animații), spune-mi și fac doar acele bucăți.
