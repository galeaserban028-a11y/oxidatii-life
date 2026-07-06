# Oxidatii - Run All pipeline (PowerShell)
# 1) Inject secrets  2) Install deps  3) Build web  4) Cap sync  5) Sign + bundleRelease
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

function Info($m) { Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "[OK]   $m" -ForegroundColor Green }
function Warn($m) { Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Die($m)  { Write-Host "[FAIL] $m" -ForegroundColor Red; exit 1 }

# --- 1. Inject google-services.json ---
$gsPath = "android/app/google-services.json"
if ($env:GOOGLE_SERVICES_JSON_BASE64) {
  Info "Scriu google-services.json din GOOGLE_SERVICES_JSON_BASE64"
  [IO.File]::WriteAllBytes($gsPath, [Convert]::FromBase64String($env:GOOGLE_SERVICES_JSON_BASE64))
} elseif ($env:GOOGLE_SERVICES_JSON) {
  Info "Scriu google-services.json din GOOGLE_SERVICES_JSON"
  Set-Content -Path $gsPath -Value $env:GOOGLE_SERVICES_JSON -Encoding UTF8
} elseif (-not (Test-Path $gsPath)) {
  Warn "google-services.json lipseste (seteaza GOOGLE_SERVICES_JSON_BASE64 in .env.local daca ai Firebase)"
}

# --- 2. Inject / genereaza keystore ---
$ksProps = "android/keystore.properties"
$ksFile  = "android/oxidatii-release.jks"

if ($env:ANDROID_KEYSTORE_BASE64) {
  Info "Scriu keystore din ANDROID_KEYSTORE_BASE64"
  [IO.File]::WriteAllBytes($ksFile, [Convert]::FromBase64String($env:ANDROID_KEYSTORE_BASE64))
}

if ($env:KEYSTORE_PASSWORD -and $env:KEY_ALIAS -and $env:KEY_PASSWORD) {
  Info "Scriu keystore.properties din env"
  @(
    "storeFile=$((Resolve-Path $ksFile -ErrorAction SilentlyContinue) ?? 'oxidatii-release.jks')",
    "storePassword=$env:KEYSTORE_PASSWORD",
    "keyAlias=$env:KEY_ALIAS",
    "keyPassword=$env:KEY_PASSWORD"
  ) | Set-Content -Path $ksProps -Encoding ASCII
}

if (-not (Test-Path $ksFile)) {
  Info "Generez keystore nou (oxidatii-release.jks)"
  $pw = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 24 | % {[char]$_})
  & "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -v -keystore $ksFile -alias oxidatii `
    -keyalg RSA -keysize 2048 -validity 10000 `
    -storepass $pw -keypass $pw `
    -dname "CN=Oxidatii, OU=App, O=Oxidatii, L=City, ST=RO, C=RO" | Out-Null
  @(
    "storeFile=../oxidatii-release.jks",
    "storePassword=$pw",
    "keyAlias=oxidatii",
    "keyPassword=$pw"
  ) | Set-Content -Path $ksProps -Encoding ASCII
  Ok "Keystore generat. Parolele sunt in android/keystore.properties (nu commit-a!)"
}

# --- 3. Deps + build web ---
if (-not (Test-Path "node_modules")) { Info "bun install"; bun install }
Info "bun run build"; bun run build
if ($LASTEXITCODE -ne 0) { Die "Build web esuat" }

# --- 4. Capacitor sync ---
Info "npx cap sync android"
npx cap sync android
if ($LASTEXITCODE -ne 0) { Die "cap sync esuat" }

# --- 5. Bundle release (auto-bump versionCode based on epoch minutes, fits Play 2.1e9) ---
if (-not $env:ANDROID_VERSION_CODE) {
  $env:ANDROID_VERSION_CODE = [string][int64](([DateTimeOffset]::UtcNow.ToUnixTimeSeconds() / 60))
  Info "ANDROID_VERSION_CODE auto = $($env:ANDROID_VERSION_CODE)"
}
if (-not $env:ANDROID_VERSION_NAME) { $env:ANDROID_VERSION_NAME = "1.0.$(Get-Date -Format yyyyMMdd)" }
Info "gradlew :app:bundleRelease (versionCode=$($env:ANDROID_VERSION_CODE) name=$($env:ANDROID_VERSION_NAME))"
Push-Location android
try {
  .\gradlew.bat :app:bundleRelease --no-daemon
  if ($LASTEXITCODE -ne 0) { Die "bundleRelease esuat" }
} finally { Pop-Location }

$aab = "android/app/build/outputs/bundle/release/app-release.aab"
if (-not (Test-Path $aab)) { Die "AAB nu a fost generat" }
Ok "AAB gata: $aab"

# 6. Upload automat Google Play (optional)
$track  = if ($env:GOOGLE_PLAY_TRACK)  { $env:GOOGLE_PLAY_TRACK }  elseif ($env:PLAY_TRACK)  { $env:PLAY_TRACK }  else { "" }
$status = if ($env:GOOGLE_PLAY_STATUS) { $env:GOOGLE_PLAY_STATUS } elseif ($env:PLAY_STATUS) { $env:PLAY_STATUS } else { "draft" }
$hasSA  = $env:GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64 -or $env:GOOGLE_PLAY_SERVICE_ACCOUNT_JSON -or $env:GOOGLE_PLAY_SERVICE_ACCOUNT_FILE

if ($track -and $hasSA) {
  $allowed = @("internal","alpha","beta","production")
  if ($allowed -notcontains $track) { Die "GOOGLE_PLAY_TRACK invalid: $track (internal|alpha|beta|production)" }
  Info "Urc AAB in Google Play (track=$track, status=$status)"
  $env:GOOGLE_PLAY_TRACK   = $track
  $env:GOOGLE_PLAY_STATUS  = $status
  $env:GOOGLE_PLAY_AAB_PATH = (Resolve-Path $aab).Path
  bun scripts/google-play-upload.mjs
  if ($LASTEXITCODE -ne 0) { Die "Upload Google Play esuat" }
  Ok "AAB urcat in Google Play ($track / $status)"
} else {
  Warn "Skip upload Google Play. Seteaza GOOGLE_PLAY_TRACK (internal|alpha|beta|production) si GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64 ca sa urc automat."
}
