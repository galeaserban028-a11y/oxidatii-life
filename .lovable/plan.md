## Ce fac

Bundeluiesc tot UI-ul în APK pentru Android, astfel încât aplicația să nu mai încarce `https://oxidatii.life` la fiecare navigare. iOS rămâne exact cum e acum (funcționează perfect prin `server.url`).

## Cum arată după

- **Android**: deschizi aplicația → UI-ul se randează instant din APK. Doar apelurile la backend (login, feed, chat, upload) pleacă în rețea, ca la orice aplicație nativă normală.
- **iOS**: nimic schimbat.
- **Web (oxidatii.life)**: nimic schimbat — rămâne SSR pe Cloudflare pentru SEO și link-uri publice.

## Pași concreți

```text
1. Adaug script `bun run build:spa` în package.json
   → produce dist/spa/ (client-side rendering, fără SSR)
   → toate rutele TanStack rulează pe client
   → serverFn-urile știu să lovească https://oxidatii.life prin VITE_SERVER_URL

2. Modific vite.config.ts să suporte modul SPA
   → detectează env BUILD_MODE=spa
   → dezactivează SSR, output în dist/spa/

3. Modific capacitor.config.ts
   → webDir: "dist/spa" (în loc de "capacitor-www")
   → server.url rămâne DOAR pentru iOS (via platform detection)
   → Android citește bundle-ul local

4. Modific .github/workflows/android-release.yml
   → rulează `bun run build:spa` înainte de `cap sync android`
   → APK-ul include dist/spa/ direct

5. Verific că OAuth-ul (Google/Apple) merge:
   → callback rămâne pe https://oxidatii.life/auth/callback
   → apoi redirect prin oxidatii:// deep link (deja configurat)
```

## Ce se poate strica (și cum evit)

- **Loader-e pe rute autentificate**: rulează pe client (nu SSR) → un request extra la prima intrare, dar funcționează. Acceptabil.
- **`process.env.VITE_SERVER_URL`**: trebuie setat la build time la `https://oxidatii.life` ca serverFn-urile să lovească producția, nu `localhost`.
- **Prima deschidere după update de UI**: userul trebuie să descarce noul APK din Play Store. Nu mai există "publish web = update instant pe Android". Ăsta e trade-off-ul lui B — dar tu deja publici pe Play Store, deci nu e o problemă nouă.
- **SEO**: rămâne pe oxidatii.life (SSR Cloudflare), neschimbat.
- **Push, deep links, assetlinks.json**: rămân pe domeniul public, nu se ating.

## Ce NU pot testa eu

Sandbox-ul rulează Chromium desktop headless — nu Android WebView. După ce fac modificările:
1. GitHub Actions îți produce APK-ul nou
2. Îl instalezi pe telefon
3. Îmi zici dacă:
   - se deschide instant (fără să pară că încarcă din web)
   - scroll-ul e fluid
   - login/OAuth merge
   - feed-ul, chat-ul, upload-ul, notificările merg

Dacă ceva scârțâie, iterăm — dar prima variantă ar trebui să prindă din prima pentru că schimbările sunt izolate (Capacitor + build mode, nu logică de aplicație).

## Fișiere atinse

- `capacitor.config.ts`
- `vite.config.ts`
- `package.json` (script nou)
- `.github/workflows/android-release.yml`
- eventual un mic helper `src/lib/api-base.ts` pentru serverFn base URL

## Confirmă

Merg pe planul ăsta? După confirmare fac toate modificările într-un batch și îți zic exact ce workflow să rulezi în GitHub Actions ca să-ți iasă APK-ul nou.
