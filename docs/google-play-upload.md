# Upload automat AAB → Google Play

Workflow: `.github/workflows/android-release.yml`

## Cum se rulează

- **Pe Windows, local:** dublu-click pe `BUILD_ANDROID_AAB.bat`. Scriptul
  generează singur un keystore dacă nu există, face build + sync Capacitor și
  produce `android/app/build/outputs/bundle/release/app-release.aab`.
- **Din terminal, local:** `bun run android:release`.
- **Manual:** GitHub → Actions → "Android Release → Google Play" → Run workflow.
  Alegi `track` (internal / alpha / beta / production) și `status`
  (draft / inProgress / completed / halted).
- **Automat:** push un tag `android-v1.0.3` → build + upload pe track `internal`
  cu status `draft`.

`versionCode` e setat automat din `github.run_number` (unic, crescător).
`versionName` rămâne cel din `android/app/build.gradle` — bumpuiește-l manual
când vrei să crești numărul de versiune vizibil.

## Secrete necesare (GitHub → Settings → Secrets and variables → Actions)

| Secret | Cum îl obții |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 oxidatii-release.jks` (Linux/Mac) sau `[Convert]::ToBase64String([IO.File]::ReadAllBytes("oxidatii-release.jks"))` (PowerShell) |
| `ANDROID_KEYSTORE_PASSWORD` | Parola keystore-ului |
| `ANDROID_KEY_ALIAS` | Ex: `oxidatii` |
| `ANDROID_KEY_PASSWORD` | Parola cheii |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | JSON-ul complet al service account-ului (vezi mai jos) |
| `GOOGLE_SERVICES_JSON_BASE64` *(opțional)* | Firebase `google-services.json` codat base64, pentru push notifications |

## Service Account pentru Google Play

1. **Google Play Console** → *Setup → API access* → *Create new service account*
   → te trimite în Google Cloud Console.
2. În Google Cloud: creează un service account (ex: `play-publisher@…`),
   apoi *Keys → Add key → JSON* → descarcă fișierul.
3. Înapoi în Play Console → *API access* → *Grant access* la service account cu
   permisiunea **Release manager** (sau minim: *Release to production, exclude
   devices, and use Play App Signing* + *View app information and download bulk
   reports*).
4. Copiază tot conținutul JSON-ului în secretul `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`.

## Prima urcare (foarte important)

Google Play nu acceptă upload prin API pentru un `applicationId` nou. Prima
versiune (`com.oxidatii.app`) TREBUIE urcată manual din Play Console (draft în
Internal testing e suficient). După prima urcare acceptată, workflow-ul preia
totul.

## Dacă „nu merge”

Rulează `BUILD_ANDROID_AAB.bat` și trimite exact textul roșu de la final. Cele
mai comune cauze sunt: Bun lipsă, Android SDK neluat încă de Android Studio,
proiectul pus într-o cale cu spații/paranteze sau lipsa primului upload manual
în Play Console pentru `com.oxidatii.app`.

## Track-uri

- `internal` – testeri interni (până la 100), review instant, fără reclame
- `alpha` / `beta` – testare închisă/deschisă
- `production` – live pe Play Store; primul release production necesită review 1-7 zile

## Ce apare la utilizatori

`android/whatsnew/whatsnew-ro-RO` = release notes RO. Adaugă și
`whatsnew-en-US` etc. pentru alte locale.
