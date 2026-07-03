#!/usr/bin/env bash
# Oxidatii – Android setup automat (macOS/Linux)
# Rulează din root-ul proiectului:  bash scripts/android-setup.sh
set -euo pipefail

echo "=== Oxidatii Android setup ==="

# 1. Verifică path
if [[ "$PWD" =~ [[:space:]\(\)] ]]; then
  echo "EROARE: path-ul proiectului conține spații sau paranteze: $PWD"
  echo "Mută proiectul într-o cale simplă și rerulează."
  exit 1
fi

# 2. Verifică bun
if ! command -v bun >/dev/null 2>&1; then
  echo "EROARE: bun nu e instalat. Instalează de la https://bun.sh"
  exit 1
fi

# 3. Curăță build vechi
echo "-> curăț build cache..."
rm -rf android/build android/.gradle android/app/build android/capacitor-cordova-android-plugins

# 4. Instalează + build
echo "-> bun install..."
bun install

echo "-> bun run build..."
bun run build

# 5. Capacitor sync
echo "-> bunx cap sync android..."
bunx cap sync android

# 6. Injectează google-services.json din env dacă e disponibil
GS_DEST="android/app/google-services.json"
if [[ -n "${GOOGLE_SERVICES_JSON_BASE64:-}" ]]; then
  echo "-> scriu $GS_DEST din GOOGLE_SERVICES_JSON_BASE64..."
  if ! echo "$GOOGLE_SERVICES_JSON_BASE64" | base64 -d > "$GS_DEST" 2>/dev/null; then
    echo "EROARE: GOOGLE_SERVICES_JSON_BASE64 nu e base64 valid."
    exit 1
  fi
elif [[ -n "${GOOGLE_SERVICES_JSON:-}" ]]; then
  echo "-> scriu $GS_DEST din GOOGLE_SERVICES_JSON (raw)..."
  printf '%s' "$GOOGLE_SERVICES_JSON" > "$GS_DEST"
elif [[ ! -f "$GS_DEST" ]]; then
  echo "WARN: $GS_DEST lipsește (push notifications nu vor merge)."
  echo "     Setează GOOGLE_SERVICES_JSON_BASE64 sau GOOGLE_SERVICES_JSON ca env var. Exemplu:"
  echo "       export GOOGLE_SERVICES_JSON_BASE64=\$(base64 -w0 ~/google-services.json)"
fi

# 7. Deschide Android Studio
echo "-> bunx cap open android..."
bunx cap open android

echo ""
echo "GATA. În Android Studio: așteaptă Gradle sync, apoi Build > Generate Signed App Bundle."
echo "Sau CLI:  cd android && ./gradlew bundleRelease"
