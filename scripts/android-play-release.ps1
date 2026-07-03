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

if (-not (Test-Path "android\app\google-services.json")) {
  Warn "android\app\google-services.json lipsește. AAB-ul se poate construi, dar push notifications native nu vor funcționa până îl adaugi."
}

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
Warn "Pentru update-uri Google Play, păstrează același keystore. Dacă îl pierzi, nu mai poți publica update-uri normale."
explorer.exe /select,"$aab"
