#!/usr/bin/env bash
# Oxidatii – build AAB release automat (macOS/Linux)
# Rulează din root: bash scripts/android-play-release.sh
set -euo pipefail

info() { printf '\033[36m-> %s\033[0m\n' "$1"; }
ok() { printf '\033[32mOK: %s\033[0m\n' "$1"; }
warn() { printf '\033[33mWARN: %s\033[0m\n' "$1"; }
fail() { printf '\033[31mEROARE: %s\033[0m\n' "$1"; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

write_google_services_json() {
  local dest="android/app/google-services.json"
  mkdir -p "$(dirname "$dest")"

  if [[ -n "${GOOGLE_SERVICES_JSON_BASE64:-}" ]]; then
    info "Injectez $dest din GOOGLE_SERVICES_JSON_BASE64"
    if ! printf '%s' "$GOOGLE_SERVICES_JSON_BASE64" | base64 -d > "$dest" 2>/dev/null; then
      fail "GOOGLE_SERVICES_JSON_BASE64 nu este base64 valid."
    fi
    ok "google-services.json injectat automat"
  elif [[ -n "${GOOGLE_SERVICES_JSON:-}" ]]; then
    info "Injectez $dest din GOOGLE_SERVICES_JSON"
    printf '%s' "$GOOGLE_SERVICES_JSON" > "$dest"
    ok "google-services.json injectat automat"
  elif [[ ! -f "$dest" ]]; then
    warn "$dest lipsește. Dacă setezi GOOGLE_SERVICES_JSON_BASE64, scriptul îl pune singur."
  fi
}

get_google_play_credentials_file() {
  local temp_file="${TMPDIR:-/tmp}/oxidatii-google-play-service-account.json"

  if [[ -n "${GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64:-}" ]]; then
    info "Pregătesc service account-ul Google Play din GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64" >&2
    if ! printf '%s' "$GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64" | base64 -d > "$temp_file" 2>/dev/null; then
      fail "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64 nu este base64 valid."
    fi
    printf '%s' "$temp_file"
    return 0
  fi

  if [[ -n "${GOOGLE_PLAY_SERVICE_ACCOUNT_JSON:-}" ]]; then
    info "Pregătesc service account-ul Google Play din GOOGLE_PLAY_SERVICE_ACCOUNT_JSON" >&2
    printf '%s' "$GOOGLE_PLAY_SERVICE_ACCOUNT_JSON" > "$temp_file"
    printf '%s' "$temp_file"
    return 0
  fi

  if [[ -f "$ROOT/android/google-play-service-account.json" ]]; then
    printf '%s' "$ROOT/android/google-play-service-account.json"
    return 0
  fi

  return 1
}

echo "=== Oxidatii Android Release AAB ==="

if [[ "$ROOT" =~ [[:space:]\(\)] ]]; then
  warn "Calea proiectului are spații/paranteze: $ROOT"
  warn "Dacă Gradle dă erori ciudate, mută folderul într-o cale simplă, ex: ~/oxidatii"
fi

command -v bun >/dev/null 2>&1 || fail "bun nu este instalat. Instalează Bun de la https://bun.sh"

if [[ -z "${ANDROID_HOME:-}" && -z "${ANDROID_SDK_ROOT:-}" && ! -f android/local.properties ]]; then
  warn "Nu găsesc ANDROID_HOME/ANDROID_SDK_ROOT sau android/local.properties. Dacă build-ul pică, deschide o dată proiectul în Android Studio ca să instaleze SDK-ul."
fi

HAS_ENV_SIGNING=0
if [[ -n "${OXIDATII_KEYSTORE_PATH:-}" && -n "${OXIDATII_KEYSTORE_PASSWORD:-}" && -n "${OXIDATII_KEY_ALIAS:-}" && -n "${OXIDATII_KEY_PASSWORD:-}" ]]; then
  HAS_ENV_SIGNING=1
fi

if [[ "$HAS_ENV_SIGNING" -eq 0 && ! -f android/keystore.properties ]]; then
  info "Nu există semnare release. Generez automat android/oxidatii-release.jks + android/keystore.properties"
  command -v keytool >/dev/null 2>&1 || fail "Nu găsesc keytool. Instalează Android Studio/JDK 21 sau setează JAVA_HOME."
  STORE_PASS="$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 40)"
  KEY_PASS="$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 40)"
  JKS="$ROOT/android/oxidatii-release.jks"
  keytool -genkeypair -v -keystore "$JKS" -alias oxidatii -keyalg RSA -keysize 2048 -validity 10000 -storepass "$STORE_PASS" -keypass "$KEY_PASS" -dname "CN=OXIDATII, OU=Mobile, O=OXIDITII, L=Bucharest, ST=Bucharest, C=RO"
  cat > android/keystore.properties <<EOF
# Generat automat de scripts/android-play-release.sh
# NU șterge și NU publica acest fișier. Ai nevoie de același keystore pentru update-uri în Google Play.
storeFile=$JKS
storePassword=$STORE_PASS
keyAlias=oxidatii
keyPassword=$KEY_PASS
EOF
  ok "Keystore release generat. Fă backup la android/oxidatii-release.jks și android/keystore.properties."
fi

write_google_services_json

info "Curăț build cache Android vechi"
rm -rf android/build android/.gradle android/app/build android/capacitor-cordova-android-plugins

info "Instalez dependențe web"
bun install

info "Construiesc aplicația web"
bun run build

info "Sincronizez Capacitor Android"
bunx cap sync android

info "Construiesc AAB release semnat"
(cd android && ./gradlew bundleRelease --no-daemon)

AAB="$ROOT/android/app/build/outputs/bundle/release/app-release.aab"
[[ -f "$AAB" ]] || fail "Build-ul a terminat, dar nu găsesc AAB-ul la $AAB"

ok "AAB gata: $AAB"

if PLAY_CREDENTIALS="$(get_google_play_credentials_file)"; then
  export GOOGLE_PLAY_PACKAGE_NAME="${GOOGLE_PLAY_PACKAGE_NAME:-com.oxidatii.app}"
  export GOOGLE_PLAY_TRACK="${GOOGLE_PLAY_TRACK:-internal}"
  export GOOGLE_PLAY_STATUS="${GOOGLE_PLAY_STATUS:-draft}"
  export GOOGLE_PLAY_SERVICE_ACCOUNT_FILE="$PLAY_CREDENTIALS"
  export GOOGLE_PLAY_AAB_PATH="$AAB"

  info "Urc AAB-ul automat în Google Play: track=$GOOGLE_PLAY_TRACK, status=$GOOGLE_PLAY_STATUS"
  bun ./scripts/google-play-upload.mjs
  ok "AAB urcat în Google Play"
else
  warn "Nu am găsit secretul Google Play, deci am făcut doar AAB local."
  warn "Pentru upload automat setează GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64 sau GOOGLE_PLAY_SERVICE_ACCOUNT_JSON."
fi

warn "Pentru update-uri Google Play, păstrează același keystore. Dacă îl pierzi, nu mai poți publica update-uri normale."
