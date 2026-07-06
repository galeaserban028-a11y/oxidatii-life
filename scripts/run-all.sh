#!/usr/bin/env bash
# Oxidatii - Run All pipeline (bash)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

C='\033[0;36m'; G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'
info(){ echo -e "${C}[INFO]${N} $*"; }
ok(){   echo -e "${G}[OK]${N}   $*"; }
warn(){ echo -e "${Y}[WARN]${N} $*"; }
die(){  echo -e "${R}[FAIL]${N} $*"; exit 1; }

# 1. google-services.json
GS="android/app/google-services.json"
if [ -n "${GOOGLE_SERVICES_JSON_BASE64:-}" ]; then
  info "Scriu $GS din GOOGLE_SERVICES_JSON_BASE64"
  printf '%s' "$GOOGLE_SERVICES_JSON_BASE64" | base64 -d > "$GS"
elif [ -n "${GOOGLE_SERVICES_JSON:-}" ]; then
  info "Scriu $GS din GOOGLE_SERVICES_JSON"
  printf '%s' "$GOOGLE_SERVICES_JSON" > "$GS"
elif [ ! -f "$GS" ]; then
  warn "$GS lipseste (opțional dacă nu folosești Firebase)"
fi

# 2. keystore
KS="android/oxidatii-release.jks"
KP="android/keystore.properties"

if [ -n "${ANDROID_KEYSTORE_BASE64:-}" ]; then
  info "Scriu keystore din ANDROID_KEYSTORE_BASE64"
  printf '%s' "$ANDROID_KEYSTORE_BASE64" | base64 -d > "$KS"
fi

if [ -n "${KEYSTORE_PASSWORD:-}" ] && [ -n "${KEY_ALIAS:-}" ] && [ -n "${KEY_PASSWORD:-}" ]; then
  info "Scriu keystore.properties din env"
  cat > "$KP" <<EOF
storeFile=oxidatii-release.jks
storePassword=${KEYSTORE_PASSWORD}
keyAlias=${KEY_ALIAS}
keyPassword=${KEY_PASSWORD}
EOF
fi

if [ ! -f "$KS" ]; then
  info "Generez keystore nou"
  PW="$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 24)"
  "$JAVA_HOME/bin/keytool" -genkeypair -v -keystore "$KS" -alias oxidatii \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$PW" -keypass "$PW" \
    -dname "CN=Oxidatii, OU=App, O=Oxidatii, L=City, ST=RO, C=RO" >/dev/null
  cat > "$KP" <<EOF
storeFile=oxidatii-release.jks
storePassword=${PW}
keyAlias=oxidatii
keyPassword=${PW}
EOF
  ok "Keystore generat -> $KP (nu commit-a!)"
fi

# 3. deps + web
[ -d node_modules ] || { info "bun install"; bun install; }
info "bun run build"; bun run build

# 4. cap sync
info "npx cap sync android"; npx cap sync android

# 5. bundle release (auto-bump versionCode based on epoch minutes, fits Play limit 2.1e9)
if [ -z "${ANDROID_VERSION_CODE:-}" ]; then
  export ANDROID_VERSION_CODE="$(( $(date -u +%s) / 60 ))"
  info "ANDROID_VERSION_CODE auto = $ANDROID_VERSION_CODE"
fi
export ANDROID_VERSION_NAME="${ANDROID_VERSION_NAME:-1.0.$(date -u +%Y%m%d)}"
info "gradlew :app:bundleRelease (versionCode=$ANDROID_VERSION_CODE name=$ANDROID_VERSION_NAME)"
( cd android && ./gradlew :app:bundleRelease --no-daemon )

AAB="android/app/build/outputs/bundle/release/app-release.aab"
[ -f "$AAB" ] || die "AAB nu a fost generat"
ok "AAB gata: $AAB"

# 6. Upload automat Google Play (opțional)
TRACK="${GOOGLE_PLAY_TRACK:-${PLAY_TRACK:-}}"
STATUS="${GOOGLE_PLAY_STATUS:-${PLAY_STATUS:-draft}}"
HAS_SA=0
[ -n "${GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64:-}" ] && HAS_SA=1
[ -n "${GOOGLE_PLAY_SERVICE_ACCOUNT_JSON:-}" ] && HAS_SA=1
[ -n "${GOOGLE_PLAY_SERVICE_ACCOUNT_FILE:-}" ] && HAS_SA=1

if [ -n "$TRACK" ] && [ "$HAS_SA" = "1" ]; then
  info "Urc AAB în Google Play (track=$TRACK, status=$STATUS)"
  export GOOGLE_PLAY_TRACK="$TRACK"
  export GOOGLE_PLAY_STATUS="$STATUS"
  export GOOGLE_PLAY_AAB_PATH="$AAB"
  bun scripts/google-play-upload.mjs || die "Upload Google Play eșuat"
  ok "AAB urcat în Google Play ($TRACK / $STATUS)"
else
  warn "Skip upload Google Play. Setează GOOGLE_PLAY_TRACK (internal|alpha|beta|production) și GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64 ca să urc automat."
fi
