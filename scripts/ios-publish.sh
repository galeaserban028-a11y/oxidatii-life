#!/usr/bin/env bash
# ============================================================
# OXIDAȚII — Publicare 100% automată pe App Store
# ============================================================
# Rulezi: ./scripts/ios-publish.sh   (sau dublu-click pe PUBLISH_IOS.command)
# Face TOT: preflight → build web → cap sync → archive → export → upload.
#
# CE TREBUIE TU (o singură dată, ~10 min):
#   1. Mac cu Xcode (deschide-l o dată, acceptă licența, adaugă Apple ID)
#   2. Cont Apple Developer ($99/an)
#   3. Cheie App Store Connect API:
#        https://appstoreconnect.apple.com/access/integrations/api
#        → "+" → Access: "App Manager" → Generate
#        → descarci AuthKey_XXXXXXXXXX.p8 (o singură dată!)
#        → notezi Key ID + Issuer ID
#   4. Copiezi ios/fastlane.env.example → ios/fastlane.env și completezi.
#   5. Pui AuthKey_*.p8 în ios/private_keys/
#   6. (Prima dată) Creezi app-ul în App Store Connect cu bundle ID com.oxidatii.app
#
# Apoi rulezi scriptul de câte ori vrei să publici o versiune nouă.
# ============================================================

set -euo pipefail

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()  { echo -e "${BLUE}▶${NC} $*"; }
ok()    { echo -e "${GREEN}✓${NC} $*"; }
warn()  { echo -e "${YELLOW}⚠${NC} $*"; }
fail()  { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# ---------- 0/8 Preflight ----------
info "0/8  Preflight checks..."

[[ "$(uname)" == "Darwin" ]] || fail "Publicarea pe App Store se poate face doar de pe macOS."

command -v xcodebuild >/dev/null || fail "Xcode nu e instalat. Instalează din App Store, apoi rulează: sudo xcode-select --install"

if ! xcode-select -p >/dev/null 2>&1; then
  fail "Xcode command line tools nu sunt configurate. Rulează: sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
fi

command -v bun >/dev/null || fail "bun nu e instalat. Rulează: curl -fsSL https://bun.sh/install | bash"

ENV_FILE="ios/fastlane.env"
[[ -f "$ENV_FILE" ]] || fail "Lipsește $ENV_FILE. Copiază ios/fastlane.env.example → ios/fastlane.env și completează."

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

: "${APPLE_TEAM_ID:?Setează APPLE_TEAM_ID în ios/fastlane.env}"
: "${APP_BUNDLE_ID:=com.oxidatii.app}"
: "${APP_STORE_KEY_ID:?Setează APP_STORE_KEY_ID în ios/fastlane.env}"
: "${APP_STORE_ISSUER_ID:?Setează APP_STORE_ISSUER_ID în ios/fastlane.env}"
: "${APP_STORE_KEY_PATH:=$ROOT/ios/private_keys/AuthKey_${APP_STORE_KEY_ID}.p8}"

[[ "$APPLE_TEAM_ID" != "XXXXXXXXXX" ]] || fail "APPLE_TEAM_ID e încă placeholder. Completează în $ENV_FILE."
[[ "$APP_STORE_KEY_ID" != "XXXXXXXXXX" ]] || fail "APP_STORE_KEY_ID e încă placeholder. Completează în $ENV_FILE."

[[ -f "$APP_STORE_KEY_PATH" ]] || fail "Nu găsesc cheia $APP_STORE_KEY_PATH. Pune AuthKey_*.p8 în ios/private_keys/"

# altool caută cheia în locații fixe — copiem/symlink acolo ca să meargă orice ai pus în env
APPLE_PRIVATE_KEYS_DIR="$HOME/.appstoreconnect/private_keys"
mkdir -p "$APPLE_PRIVATE_KEYS_DIR"
KEY_TARGET="$APPLE_PRIVATE_KEYS_DIR/AuthKey_${APP_STORE_KEY_ID}.p8"
if [[ ! -f "$KEY_TARGET" ]]; then
  cp "$APP_STORE_KEY_PATH" "$KEY_TARGET"
  chmod 600 "$KEY_TARGET"
fi

: "${APP_NAME:=OXIDAȚII}"
: "${APP_SKU:=oxidatii-ios}"
: "${APP_PRIMARY_LANGUAGE:=en-US}"

ok "Preflight OK  (Team=$APPLE_TEAM_ID, Bundle=$APP_BUNDLE_ID)"

# ---------- 0.5/8 Auto-create app in App Store Connect ----------
info "0.5/8  Verific dacă app-ul există în App Store Connect..."

# Build fastlane API key JSON (folosit atât de produce cât și de altele)
FASTLANE_KEY_JSON="$ROOT/ios/build/asc_api_key.json"
mkdir -p "$ROOT/ios/build"
KEY_CONTENT=$(cat "$APP_STORE_KEY_PATH")
cat > "$FASTLANE_KEY_JSON" <<EOF
{
  "key_id": "$APP_STORE_KEY_ID",
  "issuer_id": "$APP_STORE_ISSUER_ID",
  "key": $(printf '%s' "$KEY_CONTENT" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))'),
  "in_house": false
}
EOF
chmod 600 "$FASTLANE_KEY_JSON"

if ! command -v fastlane >/dev/null; then
  warn "fastlane lipsește — îl instalez (o singură dată, ~2 min)..."
  if command -v brew >/dev/null; then
    brew install fastlane || sudo gem install fastlane -NV
  else
    sudo gem install fastlane -NV
  fi
fi

# produce creează app-ul dacă nu există; dacă există, iese cu 0 fără să facă nimic
fastlane produce \
  --skip_itc false \
  --skip_devcenter true \
  --app_identifier "$APP_BUNDLE_ID" \
  --app_name "$APP_NAME" \
  --language "$APP_PRIMARY_LANGUAGE" \
  --sku "$APP_SKU" \
  --team_id "$APPLE_TEAM_ID" \
  --api_key_path "$FASTLANE_KEY_JSON" \
  2>&1 | grep -v "^\[" | tail -20 || warn "produce a raportat ceva — dacă app-ul deja există, e ok."

# ---------- 1/8 Deps ----------
info "1/8  Instalez dependințe npm..."
bun install

# ---------- 2/8 Build web ----------
info "2/8  Build web (dist/client)..."
bun run build
[[ -d "dist/client" ]] || fail "dist/client nu a fost generat. Verifică output-ul build-ului."

# ---------- 3/8 Capacitor iOS ----------
info "3/8  Sync Capacitor iOS..."
if [[ ! -d "ios/App" ]]; then
  warn "Platformă iOS lipsește — o adaug."
  bunx cap add ios
fi
bunx cap sync ios

# ---------- 4/8 CocoaPods ----------
info "4/8  Instalez CocoaPods (dacă lipsesc)..."
if [[ -f "ios/App/Podfile" ]]; then
  ( cd ios/App && pod install --repo-update 2>/dev/null || pod install )
fi

# ---------- 5/8 Build number ----------
info "5/8  Setez build number..."
cd ios/App
BUILD_NUMBER=$(date +%Y%m%d%H%M)
xcrun agvtool new-version -all "$BUILD_NUMBER" >/dev/null
ok "Build number: $BUILD_NUMBER"

# ---------- 6/8 Archive ----------
info "6/8  Archive (5-10 min)..."
ARCHIVE_PATH="$ROOT/ios/build/Oxidatii.xcarchive"
EXPORT_PATH="$ROOT/ios/build/export"
mkdir -p "$ROOT/ios/build"
rm -rf "$ARCHIVE_PATH" "$EXPORT_PATH"

# Detectăm dacă e workspace (după pod install) sau doar project
BUILD_TARGET_FLAG="-project App.xcodeproj"
[[ -d "App.xcworkspace" ]] && BUILD_TARGET_FLAG="-workspace App.xcworkspace"

XC_LOG="$ROOT/ios/build/xcodebuild.log"

# shellcheck disable=SC2086
xcodebuild \
  $BUILD_TARGET_FLAG \
  -scheme App \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath "$ARCHIVE_PATH" \
  -allowProvisioningUpdates \
  -skipPackagePluginValidation \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
  PRODUCT_BUNDLE_IDENTIFIER="$APP_BUNDLE_ID" \
  archive 2>&1 | tee "$XC_LOG" | grep -E "^(===|CompileC|Ld|CodeSign|ProcessProductPackaging|error:|warning:|\*\*)" || true

[[ -d "$ARCHIVE_PATH" ]] || { warn "Log complet: $XC_LOG"; fail "Archive a eșuat. Deschide log-ul de mai sus pentru detalii."; }
ok "Archive gata: $ARCHIVE_PATH"

# ---------- 7/8 Export IPA ----------
info "7/8  Export IPA..."
cat > "$ROOT/ios/build/ExportOptions.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store</string>
  <key>teamID</key><string>$APPLE_TEAM_ID</string>
  <key>uploadBitcode</key><false/>
  <key>uploadSymbols</key><true/>
  <key>signingStyle</key><string>automatic</string>
  <key>destination</key><string>export</string>
  <key>generateAppStoreInformation</key><true/>
</dict>
</plist>
EOF

XC_EXPORT_LOG="$ROOT/ios/build/xcodebuild-export.log"
xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" \
  -exportOptionsPlist "$ROOT/ios/build/ExportOptions.plist" \
  -allowProvisioningUpdates 2>&1 | tee "$XC_EXPORT_LOG" | grep -E "(error:|warning:|Exported|\*\*)" || true

IPA_PATH=$(find "$EXPORT_PATH" -name "*.ipa" 2>/dev/null | head -1)
[[ -n "$IPA_PATH" && -f "$IPA_PATH" ]] || { warn "Log export: $XC_EXPORT_LOG"; fail "Nu s-a generat IPA."; }
ok "IPA: $IPA_PATH"

# ---------- 8/8 Upload ----------
info "8/8  Upload la App Store Connect..."
cd "$ROOT"

xcrun altool --upload-app \
  --type ios \
  --file "$IPA_PATH" \
  --apiKey "$APP_STORE_KEY_ID" \
  --apiIssuer "$APP_STORE_ISSUER_ID" \
  --verbose 2>&1 | tail -30

echo ""
echo "════════════════════════════════════════════════════════"
ok "GATA! Build $BUILD_NUMBER trimis la App Store Connect."
echo ""
echo "  → https://appstoreconnect.apple.com"
echo "  → TestFlight: build-ul apare după ~10-30 min de procesare"
echo "  → Prima dată: completează listing (screenshots, descriere) și Submit for Review"
echo "════════════════════════════════════════════════════════"
