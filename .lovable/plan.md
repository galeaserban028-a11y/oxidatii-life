## Obiectiv

Pe Android, aplicația să nu mai încarce `https://oxidatii.life` la fiecare navigare (asta îți dă senzația de "web lent"). În loc de asta, tot UI-ul se bundeluiește în APK; doar apelurile la backend (server functions, Supabase, etc.) pleacă în rețea.

Pe iOS lăsăm cum e (funcționează perfect).

## Ce implică (tehnic, dar contează)

TanStack Start rulează SSR pe Cloudflare. Ca să bage tot UI-ul în APK trebuie:

1. **Un al doilea build target: "SPA/native"** — același cod, dar cu `ssr: false` global și output static (`dist/spa/`). Rutele merg tot prin TanStack Router, doar că totul se randează pe client.
2. **Toate `createServerFn` să știe unde e serverul** — în mod SPA, `createServerFn` face fetch la un URL absolut. Setăm `VITE_SERVER_URL=https://oxidatii.life` la build-ul de SPA și configurăm baza corect, ca serverfn-urile să meargă la producție.
3. **Capacitor pe Android schimbă strategia**:
   - `webDir: "dist/spa"` (bundle local)
   - `server.url` **ștearsă doar pe Android** (rămâne doar pentru iOS, unde funcționează)
   - `server.androidScheme: "https"` ca cookie-urile / OAuth-ul să meargă
4. **OAuth callback** rămâne pe HTTPS la `oxidatii.life`, apoi redirect prin `oxidatii://oauth` (deja e configurat, verificăm).
5. **Push, deep links, `.well-known/assetlinks.json`** — rămân pe domeniul public, nu se schimbă.

## Pași (în ordine)

```text
1. Adaug script `bun run build:spa` care produce dist/spa/ (ssr: false)
2. Config Capacitor: iOS păstrează server.url; Android citește webDir local
3. Toate serverFn primesc VITE_SERVER_URL absolut în modul SPA
4. Workflow-ul android-release.yml rulează build:spa înainte de cap sync
5. Test: cap sync android + verificare că APK-ul deschide UI fără rețea
6. Fix perf Android separat: elimin backdrop-blur unde e overlay peste conținut animat (recomandat de Lovable), scad animațiile de tranziție pe Android low-end
```

## Ce trebuie să știi că se poate strica

- **Rutele care fac data-fetch în `loader` sub `_authenticated/`** merg tot bine (loaderul rulează pe client în SPA), dar fac un request extra la prima intrare. E acceptabil.
- **SEO și link-uri publice** (index, /u/$handle, blog etc.) rămân servite de Cloudflare SSR — SPA-ul e doar în APK-ul Android.
- **Prima deschidere după update** trebuie să descarce noul APK; nu mai există "publish web = update instant pe Android". Ăsta e trade-off-ul lui B.
- **Testarea reală**: nu pot testa APK-ul din sandbox. Îți dau build-ul prin GitHub Actions (workflow-ul deja există) și tu îl instalezi pe telefon. Dacă ceva scârțâie, iterăm.

## Perf Android (în același PR)

- Elimin `backdrop-blur` de pe elemente peste conținut animat (bar tab, header sticky peste feed) — înlocuiesc cu fundal solid + `text-shadow` unde e nevoie.
- `PageTransition` deja e dezactivat pe `perf: "low"`; forțez `perf: "low"` pe Android WebView cu RAM < 4GB.
- `SwipeNavigator` rămâne, dar pe Android reduc pragul de detecție ca să nu concureze cu scroll-ul.

## Confirmă înainte să încep

Vrei să merg direct pe planul ăsta? Odată ce încep, atinge:
- `capacitor.config.ts`
- `vite.config.ts` (adaugă mod SPA)
- `package.json` (script nou)
- `.github/workflows/android-release.yml`
- câteva componente cu `backdrop-blur`

E o schimbare mare — dacă vrei să facem doar partea de perf Android fără bundling SPA, spune-mi și rămânem la lag-fix.