# Publicare nativă (App Store + Google Play)

Această aplicație folosește **Capacitor 8** ca să împacheteze build-ul web
într-un binar nativ. Mai jos sunt pașii pentru a trece de la modul „web
wrapper” la o aplicație care încarcă local assets-urile și folosește API-uri
native (geolocație, cameră, push, share, haptics).

## 1. Configurare Capacitor

`capacitor.config.ts` este deja setat să folosească `dist/client` ca
`webDir`. Nu mai există `server.url` în producție, deci aplicația încarcă
build-ul local — cerință obligatorie pentru App Store / Play Store.

Pentru a dezvolta nativ împotriva preview-ului Lovable:

```bash
CAP_SERVER_URL="https://oxidatii.life" bun run cap:sync
```

## 2. Build și sync

```bash
bun install
bun run build               # produce dist/client
bunx cap add ios            # doar prima dată
bunx cap add android        # doar prima dată
bunx cap sync               # copiază dist/client + pluginurile native
```

## 3. iOS — Info.plist

Adaugă în `ios/App/App/Info.plist` (cerut de App Store Review):

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>OXIDAȚII folosește locația ca să-ți arate cluburi, prieteni și șprițuri în apropiere.</string>
<key>NSCameraUsageDescription</key>
<string>OXIDAȚII folosește camera pentru poze la faze și avatar.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>OXIDAȚII salvează în galerie cardurile night-wrap pe care le distribui.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>OXIDAȚII îți permite să alegi poze din galerie pentru faze.</string>
<key>NSMicrophoneUsageDescription</key>
<string>OXIDAȚII folosește microfonul pentru mesajele vocale din chat.</string>
<key>NSUserTrackingUsageDescription</key>
<string>Folosit doar dacă pornești analitice partenere.</string>
```

Activează în `Signing & Capabilities`:

- Push Notifications
- Background Modes → Remote notifications

## 4. Android — AndroidManifest.xml

Verifică `android/app/src/main/AndroidManifest.xml` are:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.VIBRATE" />
```

## 5. Push notificări native

Pentru push 100% nativ (APNs + FCM) — separat de web push:

1. iOS: descarcă cheia APNs de pe Apple Developer și uploadeaz-o în Firebase
   sau în providerul tău de push.
2. Android: descarcă `google-services.json` din Firebase Console și pune-l în
   `android/app/` (șablon gata completat în `android/app/google-services.json.template`).
3. iOS: descarcă `GoogleService-Info.plist` din Firebase Console și pune-l în
   `ios/App/App/` (șablon gata completat în `ios/App/App/GoogleService-Info.plist.template`).
4. Folosește `@capacitor/push-notifications` (deja instalat) ca să iei
   token-ul nativ și să-l trimiți în `push_subscriptions` cu un canal
   separat (`apns` / `fcm`).

Notă: web-push-ul actual continuă să funcționeze în PWA, dar **nu** pe
iOS nativ.

## 6. Materiale pentru store

- **Icon**: 1024×1024 PNG (fără transparență pentru iOS) — sursa este în `resources/icon.png`.
- **Splash**: 2732×2732 PNG, logo centrat pe `#1a120c` — sursa este în `resources/splash.png`.
- **Screenshots iOS**: 6.7" (iPhone 15 Pro Max) + 5.5" (legacy) — minim 3.
- **Screenshots Android**: telefon (1080×1920) + 7" tabletă.
- **Privacy policy URL**: https://oxidatii.life/privacy
- **Support URL**: https://oxidatii.life/support
- **App description** (RO + EN): `docs/store-listings.md`.
- **Age rating**: 17+ (nightlife, alcool).
- **Data safety form (Play)**: `docs/data-safety.md`.
- **App Privacy Nutrition Label (App Store)**: `docs/app-privacy-nutrition.md`.


## 7. Build de release

```bash
# iOS
bunx cap open ios
# → Xcode: Product → Archive → Distribute App → App Store Connect

# Android
bunx cap open android
# → Build → Generate Signed Bundle (AAB) → upload în Play Console
```

## 8. Checklist final pre-submit

### Pre-build

- [ ] `bun run build` rulează curat (no warnings critice)
- [ ] `bunx cap sync` → 10 pluginuri detectate pe iOS + Android
- [ ] `capacitor.config.ts` NU are `server.url` setat (doar în dev cu `CAP_SERVER_URL`)
- [ ] `dist/client` < 50MB
- [ ] Icon-uri + splash generate (`resources/` → `bunx @capacitor/assets generate`)

### iOS

- [ ] Xcode → Signing & Capabilities: **Push Notifications** + **Background Modes** (Remote notifications + Location updates)
- [ ] Xcode → Associated Domains: `applinks:oxidatii.life`
- [ ] Apple Team ID înlocuit în `public/.well-known/apple-app-site-association` (înlocuiește `TEAMID`)
- [ ] Bundle version + build number incrementate
- [ ] App Store Connect: descriere RO + EN, 3+ screenshots 6.7", privacy policy URL
- [ ] Age rating: 17+

### Android

- [ ] `android/app/google-services.json` adăugat (Firebase pentru FCM)
- [ ] `versionCode` + `versionName` incrementate în `android/app/build.gradle`
- [ ] SHA-256 al cheii de release înlocuit în `public/.well-known/assetlinks.json` (`keytool -list -v -keystore release.keystore | grep SHA256`)
- [ ] Signed AAB generat: `bunx cap open android` → Build → Generate Signed Bundle
- [ ] Play Console: Data Safety form completat (locație, mesaje, poze, push token)

### Smoke test pe device fizic

- [ ] Login + Google OAuth merge
- [ ] Locația cere permisiune o singură dată și rămâne activă
- [ ] Push token se înregistrează în `push_subscriptions` (verifică în DB)
- [ ] Camera funcționează (avatar + faze)
- [ ] Haptics: check-in, vote, follow, like, send message
- [ ] Native share: Night Wrap deschide share sheet-ul nativ
- [ ] Deep link: deschide `https://oxidatii.life/app/venue/<id>` din Notes/Safari → aplicația preia ruta
- [ ] Offline: ecranul de eroare apare, nu crash
