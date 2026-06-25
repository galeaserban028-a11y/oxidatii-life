# Refacere hartă în stil Neon Violet/Roz

Reconstruim stilul hărții din `src/components/app/RomaniaMap3D.tsx` ca să arate ca varianta neon de altădată: fundal foarte întunecat, contururi și drumuri cu glow magenta/violet, ape adânci, orașe luminoase.

## Ce schimbăm

1. **Înlocuim `VOYAGER_STYLE` cu un stil neon nou** (`NEON_NIGHT_STYLE`) bazat pe OpenFreeMap vector tiles:
   - Fundal: `#0d0b1e` (violet foarte închis)
   - Apă: `#05030f` cu contur subtil `#2a1145`
   - Landcover/parks: `#15102a`
   - Borduri țări: linie magenta `#ff3df0` cu blur/glow (line-blur 6, line-width 1.5, opacitate dublă pentru efect halo)
   - Borduri județe: violet `#a855f7` mai subțire cu glow ușor
   - Drumuri majore (motorway/trunk): cyan-magenta `#ff5cf0` cu halo `line-blur: 4`, plus un layer dublu mai lat și transparent pentru glow
   - Drumuri secundare: violet `#7a3df0` mai subtil
   - Etichete orașe: text alb `#ffffff` cu halo magenta `#ff3df0` (halo-width 2, halo-blur 3)

2. **Renunțăm la fallback-ul raster** (CartoDB) introdus în tura precedentă — revenim 100% pe stilul vectorial neon, dar păstrăm listener-ul `error` pe sursă ca să logăm dacă pică tile-urile.

3. **Markere și clusterizare** rămân exact cum sunt (cercuri, prieteni, promoted) — doar ajustăm culorile de contur/glow ca să se potrivească cu noul fundal:
   - Cluster glow: `rgba(255, 61, 240, 0.55)`
   - Border markere venue: `#ff3df0`

4. **Performanță mobil**: păstrăm toate layer-ele neon active și pe mobil (utilizatorul a cerut glow complet). Reducem doar densitatea etichetelor (deja avem collision detection) ca să rămână fluid.

5. **PWA cache bust**: bump la versiunea SW din `src/lib/pwa.ts` (un comentariu/constantă de versiune) ca utilizatorii să primească noul stil fără să rămână pe varianta veche cachuită.

## Ce NU schimbăm

- Logica de geolocație, prieteni, venues, clusterizare, collision detection orașe
- Layout-ul paginii `/app/map`
- Restul aplicației

## Verificare

- Playwright screenshot pe `/app/map` la 1280×1800 și la viewport mobil (390×844) ca să confirmăm că glow-ul magenta apare pe borduri/drumuri și că markerii sunt vizibili.