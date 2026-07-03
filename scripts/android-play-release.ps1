# Oxidatii – build AAB release automat (Windows)
# Rulează din root: powershell -ExecutionPolicy Bypass -File scripts\android-play-release.ps1
$ErrorActionPreference = "Stop"

function Info($msg) { Write-Host "-> $msg" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "OK: $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "WARN: $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "EROARE: $msg" -ForegroundColor Red; exit 1 }

function Find-Exe($name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

function Find-Keytool {
  $direct = Find-Exe "keytool.exe"
  if ($direct) { return $direct }

  $candidates = @()
  if ($env:JAVA_HOME) { $candidates += (Join-Path $env:JAVA_HOME "bin\keytool.exe") }
  $candidates += "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe"
  $candidates += "C:\Program Files\Android\Android Studio\jre\bin\keytool.exe"
  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) { return $candidate }
  }
  return $null
}

function New-Password {
  return (([guid]::NewGuid().ToString("N")) + ([guid]::NewGuid().ToString("N"))).Substring(0, 40)
}

function Write-GoogleServicesJson {
  $dest = Join-Path $root "android\app\google-services.json"
  New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null

  if ($env:GOOGLE_SERVICES_JSON_BASE64) {
    Info "Injectez android\app\google-services.json din GOOGLE_SERVICES_JSON_BASE64"
    try {
      [IO.File]::WriteAllBytes($dest, [Convert]::FromBase64String($env:GOOGLE_SERVICES_JSON_BASE64))
      Ok "google-services.json injectat automat"
    } catch {
      Fail "GOOGLE_SERVICES_JSON_BASE64 nu este base64 valid."
    }
  } elseif ($env:GOOGLE_SERVICES_JSON) {
    Info "Injectez android\app\google-services.json din GOOGLE_SERVICES_JSON"
    [IO.File]::WriteAllText($dest, $env:GOOGLE_SERVICES_JSON)
    Ok "google-services.json injectat automat"
  } elseif (-not (Test-Path $dest)) {
    Warn "android\app\google-services.json lipsește. Dacă setezi GOOGLE_SERVICES_JSON_BASE64, scriptul îl pune singur."
  }
}

function Get-GooglePlayCredentialsFile {
  $tempFile = Join-Path ([IO.Path]::GetTempPath()) "oxidatii-google-play-service-account.json"

  if ($env:GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64) {
    Info "Pregătesc service account-ul Google Play din GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64"
    try {
      [IO.File]::WriteAllBytes($tempFile, [Convert]::FromBase64String($env:GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64))
      return $tempFile
    } catch {
      Fail "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64 nu este base64 valid."
    }
  }

  if ($env:GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) {
    Info "Pregătesc service account-ul Google Play din GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"
    [IO.File]::WriteAllText($tempFile, $env:GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)
    return $tempFile
  }

  $localFile = Join-Path $root "android\google-play-service-account.json"
  if (Test-Path $localFile) { return $localFile }

  return $null
}

Write-Host "=== Oxidatii Android Release AAB ===" -ForegroundColor Cyan

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

if ($root -match '[\s\(\)]') {
  Warn "Calea proiectului are spații/paranteze: $root"
  Warn "Dacă Gradle dă erori ciudate, mută folderul în D:\oxidatii și rulează din nou. Scriptul continuă totuși."
}

if (-not (Find-Exe "bun.exe")) { Fail "bun nu este instalat. Instalează Bun de la https://bun.sh, apoi redeschide terminalul." }

$androidHome = $env:ANDROID_HOME
if (-not $androidHome) { $androidHome = $env:ANDROID_SDK_ROOT }
if (-not $androidHome -and -not (Test-Path "android\local.properties")) {
  Warn "Nu găsesc ANDROID_HOME/ANDROID_SDK_ROOT sau android\local.properties. Dacă build-ul pică, deschide o dată proiectul în Android Studio ca să instaleze SDK-ul."
}

$keystoreProps = "android\keystore.properties"
$keystorePath = $env:OXIDATII_KEYSTORE_PATH
$hasEnvSigning = $env:OXIDATII_KEYSTORE_PATH -and $env:OXIDATII_KEYSTORE_PASSWORD -and $env:OXIDATII_KEY_ALIAS -and $env:OXIDATII_KEY_PASSWORD

if (-not $hasEnvSigning -and -not (Test-Path $keystoreProps)) {
  Info "Nu există semnare release. Generez automat android\oxidatii-release.jks + android\keystore.properties"
  $keytool = Find-Keytool
  if (-not $keytool) { Fail "Nu găsesc keytool. Instalează Android Studio/JDK 21 sau setează JAVA_HOME." }

  $storePass = New-Password
  $keyPass = New-Password
  $jks = (Join-Path $root "android\oxidatii-release.jks")

  & $keytool -genkeypair -v -keystore $jks -alias oxidatii -keyalg RSA -keysize 2048 -validity 10000 -storepass $storePass -keypass $keyPass -dname "CN=OXIDATII, OU=Mobile, O=OXIDATII, L=Bucharest, ST=Bucharest, C=RO"
  if ($LASTEXITCODE -ne 0) { Fail "keytool nu a putut genera keystore-ul." }

  @"
# Generat automat de scripts/android-play-release.ps1
# NU șterge și NU publica acest fișier. Ai nevoie de același keystore pentru update-uri în Google Play.
storeFile=$jks
storePassword=$storePass
keyAlias=oxidatii
keyPassword=$keyPass
"@ | Set-Content -Encoding UTF8 $keystoreProps

  Ok "Keystore release generat. Fă backup la android\oxidatii-release.jks și android\keystore.properties."
}

Write-GoogleServicesJson

Info "Curăț build cache Android vechi"
Remove-Item -Recurse -Force android\build, android\.gradle, android\app\build -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android\capacitor-cordova-android-plugins -ErrorAction SilentlyContinue

Info "Instalez dependențe web"
bun install
if ($LASTEXITCODE -ne 0) { Fail "bun install a eșuat." }

Info "Construiesc aplicația web"
bun run build
if ($LASTEXITCODE -ne 0) { Fail "bun run build a eșuat. Rezolvă eroarea afișată mai sus." }

Info "Sincronizez Capacitor Android"
bunx cap sync android
if ($LASTEXITCODE -ne 0) { Fail "cap sync android a eșuat." }

Info "Construiesc AAB release semnat"
Push-Location android
.\gradlew.bat bundleRelease --no-daemon
$gradleExit = $LASTEXITCODE
Pop-Location
if ($gradleExit -ne 0) { Fail "Gradle bundleRelease a eșuat. Copiază ultimele 30 de linii din eroare și trimite-mi-le." }

$aab = Join-Path $root "android\app\build\outputs\bundle\release\app-release.aab"
if (-not (Test-Path $aab)) { Fail "Build-ul a terminat, dar nu găsesc AAB-ul la $aab" }

Ok "AAB gata: $aab"

$playCredentials = Get-GooglePlayCredentialsFile
if ($playCredentials) {
  if (-not $env:GOOGLE_PLAY_PACKAGE_NAME) { $env:GOOGLE_PLAY_PACKAGE_NAME = "com.oxidatii.app" }
  if (-not $env:GOOGLE_PLAY_TRACK) { $env:GOOGLE_PLAY_TRACK = "internal" }
  if (-not $env:GOOGLE_PLAY_STATUS) { $env:GOOGLE_PLAY_STATUS = "draft" }
  $env:GOOGLE_PLAY_SERVICE_ACCOUNT_FILE = $playCredentials
  $env:GOOGLE_PLAY_AAB_PATH = $aab

  Info "Urc AAB-ul automat în Google Play: track=$env:GOOGLE_PLAY_TRACK, status=$env:GOOGLE_PLAY_STATUS"
  bun .\scripts\google-play-upload.mjs
  if ($LASTEXITCODE -ne 0) { Fail "Upload-ul către Google Play a eșuat. Textul de mai sus spune exact de ce." }
  Ok "AAB urcat în Google Play"
} else {
  Warn "Nu am găsit secretul Google Play, deci am făcut doar AAB local."
  Warn "Pentru upload automat setează GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64 sau GOOGLE_PLAY_SERVICE_ACCOUNT_JSON."
}

Warn "Pentru update-uri Google Play, păstrează același keystore. Dacă îl pierzi, nu mai poți publica update-uri normale."
if (Get-Command explorer.exe -ErrorAction SilentlyContinue) { explorer.exe /select,"$aab" }
