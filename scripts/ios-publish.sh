#!/usr/bin/env bash
# ============================================================
# OXIDAȚII — Publicare automată pe App Store
# ============================================================
# Rulezi: ./scripts/ios-publish.sh
# Face TOT: build web → cap sync → archive → export → upload la App Store Connect.
#
# CE TREBUIE TU (o singură dată, ~10 min):
#   1. Mac cu Xcode instalat (Xcode → Preferences → Accounts: adaugă Apple ID-ul tău)
#   2. Cont Apple Developer activ ($99/an)
#   3. Creezi o cheie App Store Connect API:
#        https://appstoreconnect.apple.com/access/integrations/api
#        → "+" → Name: "Oxidatii CI" → Access: "App Manager" → Generate
#        → descarci AuthKey_XXXXXXXXXX.p8 (poți doar o dată!)
#        → notezi Key ID (10 caractere) și Issuer ID (UUID)
#   4. Copiezi ios/fastlane.env.example → ios/fastlane.env și completezi.
#   5. Pui AuthKey_*.p8 în ios/private_keys/
#
# Apoi rulezi ./scripts/ios-publish.sh de câte ori vrei să publici o versiune nouă.
# ============================================================

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="ios/fastlane.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo ""
  echo "❌ Lipsește $ENV_FILE"
  echo "→ Copiază ios/fastlane.env.example în ios/fastlane.env și completează valorile."
  exit 1
fi

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

: "${APPLE_TEAM_ID:?Setează APPLE_TEAM_ID în ios/fastlane.env}"
: "${APP_BUNDLE_ID:=com.oxidatii.app}"
: "${APP_STORE_KEY_ID:?Setează APP_STORE_KEY_ID}"
: "${APP_STORE_ISSUER_ID:?Setează APP_STORE_ISSUER_ID}"
: "${APP_STORE_KEY_PATH:=ios/private_keys/AuthKey_${APP_STORE_KEY_ID}.p8}"

if [[ ! -f "$APP_STORE_KEY_PATH" ]]; then
  echo "❌ Nu găsesc cheia $APP_STORE_KEY_PATH"
  echo "→ Pune fișierul AuthKey_*.p8 în ios/private_keys/"
  exit 1
fi

if [[ "$(uname)" != "Darwin" ]]; then
  echo "❌ Publicarea pe App Store se poate face doar de pe macOS (Xcode necesar)."
  exit 1
fi

echo ""
echo "▶  1/6  Instalez dependințe..."
bun install --frozen-lockfile 2>/dev/null || bun install

echo ""
echo "▶  2/6  Build web (dist/client)..."
bun run build

echo ""
echo "▶  3/6  Sync Capacitor iOS..."
bunx cap sync ios

echo ""
echo "▶  4/6  Incrementez build number..."
cd ios/App
BUILD_NUMBER=$(date +%Y%m%d%H%M)
xcrun agvtool new-version -all "$BUILD_NUMBER" >/dev/null
echo "   Build number: $BUILD_NUMBER"

echo ""
echo "▶  5/6  Archive + Export IPA (poate dura 5-10 min)..."
ARCHIVE_PATH="$ROOT/ios/build/Oxidatii.xcarchive"
EXPORT_PATH="$ROOT/ios/build/export"
rm -rf "$ARCHIVE_PATH" "$EXPORT_PATH"

xcodebuild \
  -workspace App.xcworkspace \
  -scheme App \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath "$ARCHIVE_PATH" \
  -allowProvisioningUpdates \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
  archive | xcpretty || true

# ExportOptions.plist generat automat
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
</dict>
</plist>
EOF

xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" \
  -exportOptionsPlist "$ROOT/ios/build/ExportOptions.plist" \
  -allowProvisioningUpdates | xcpretty || true

IPA_PATH=$(find "$EXPORT_PATH" -name "*.ipa" | head -1)
if [[ -z "$IPA_PATH" ]]; then
  echo "❌ Nu s-a generat IPA. Verifică log-ul Xcode de mai sus."
  exit 1
fi
echo "   IPA: $IPA_PATH"

echo ""
echo "▶  6/6  Upload la App Store Connect..."
cd "$ROOT"

xcrun altool --upload-app \
  --type ios \
  --file "$IPA_PATH" \
  --apiKey "$APP_STORE_KEY_ID" \
  --apiIssuer "$APP_STORE_ISSUER_ID"

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ GATA! Build $BUILD_NUMBER trimis la App Store Connect."
echo ""
echo "→ Deschide https://appstoreconnect.apple.com"
echo "→ TestFlight: build-ul apare în ~10-30 min după procesare"
echo "→ Prima dată: completează listing + Submit for Review"
echo "════════════════════════════════════════════════════════"
