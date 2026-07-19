# OXIDAȚII — resync Android local cu fișierele corecte
# Rulează din root-ul proiectului:
#   powershell -ExecutionPolicy Bypass -File scripts\android-resync.ps1
# Opțional, ca să testezi și AAB-ul după resync:
#   powershell -ExecutionPolicy Bypass -File scripts\android-resync.ps1 -BundleRelease

param(
  [switch]$BundleRelease,
  [switch]$SkipInstall
)

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

function Invoke-Step($description, $scriptBlock) {
  Info $description
  & $scriptBlock
  if ($LASTEXITCODE -ne 0) { Fail "$description a eșuat." }
}

function Assert-File($path, $label) {
  if (-not (Test-Path $path)) { Fail "$label lipsește: $path" }
}

function Repair-MainActivity {
  $mainActivity = Join-Path $root "android\app\src\main\java\com\oxidatii\app\MainActivity.java"
  Assert-File $mainActivity "MainActivity.java"

  $content = Get-Content -Raw -Path $mainActivity

  if ($content -match "FLAG_TRANSLUC_TRANSIENT_NAVIGATION") {
    Warn "Am găsit constanta greșită FLAG_TRANSLUC_TRANSIENT_NAVIGATION. O repar acum."
    $content = $content.Replace("FLAG_TRANSLUC_TRANSIENT_NAVIGATION", "FLAG_TRANSLUCENT_NAVIGATION")
    Set-Content -Path $mainActivity -Value $content -Encoding UTF8
  }

  $content = Get-Content -Raw -Path $mainActivity
  if ($content -notmatch "package\s+com\.oxidatii\.app;") {
    Fail "MainActivity.java nu pare să fie pentru package-ul com.oxidatii.app. Verifică dacă ai folderul Android corect."
  }
  if ($content -match "FLAG_TRANSLUC_TRANSIENT_NAVIGATION") {
    Fail "MainActivity.java încă are constanta greșită FLAG_TRANSLUC_TRANSIENT_NAVIGATION."
  }
  if ($content -notmatch "FLAG_TRANSLUCENT_NAVIGATION") {
    Fail "MainActivity.java nu conține FLAG_TRANSLUCENT_NAVIGATION."
  }
  if ($content -notmatch "WindowCompat\.setDecorFitsSystemWindows\(window, true\)") {
    Warn "Nu găsesc setarea de inset-uri sigură în MainActivity.java. Dacă ai crash-uri de UI, resincronizează proiectul din Lovable."
  }

  Ok "MainActivity.java verificat/reparat"
}

function Write-GoogleServicesJsonIfAvailable {
  $dest = Join-Path $root "android\app\google-services.json"
  New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null

  if ($env:GOOGLE_SERVICES_JSON_BASE64) {
    Info "Injectez android\app\google-services.json din GOOGLE_SERVICES_JSON_BASE64"
    try {
      [IO.File]::WriteAllBytes($dest, [Convert]::FromBase64String($env:GOOGLE_SERVICES_JSON_BASE64))
      Ok "google-services.json injectat"
    } catch {
      Fail "GOOGLE_SERVICES_JSON_BASE64 nu este base64 valid."
    }
  } elseif ($env:GOOGLE_SERVICES_JSON) {
    Info "Injectez android\app\google-services.json din GOOGLE_SERVICES_JSON"
    [IO.File]::WriteAllText($dest, $env:GOOGLE_SERVICES_JSON)
    Ok "google-services.json injectat"
  } elseif (-not (Test-Path $dest)) {
    Warn "android\app\google-services.json lipsește. Build-ul poate merge fără push, dar FCM/push real are nevoie de fișierul Firebase corect."
  } else {
    Ok "google-services.json există"
  }
}

function Verify-CapacitorAndroidOutput {
  $capConfig = Join-Path $root "android\app\src\main\assets\capacitor.config.json"
  $indexHtml = Join-Path $root "android\app\src\main\assets\public\index.html"

  Assert-File $capConfig "capacitor.config.json generat de Capacitor"
  Assert-File $indexHtml "index.html local din APK"

  $jsonText = Get-Content -Raw -Path $capConfig
  try {
    $json = $jsonText | ConvertFrom-Json
  } catch {
    Fail "capacitor.config.json nu este JSON valid."
  }

  if ($json.appId -ne "com.oxidatii.app") {
    Fail "Capacitor appId greșit: $($json.appId). Trebuie com.oxidatii.app."
  }

  $serverUrl = $null
  if ($json.server -and ($json.server.PSObject.Properties.Name -contains "url")) {
    $serverUrl = $json.server.url
  }
  if ($serverUrl) {
    Fail "Android încă are server.url=$serverUrl, deci se deschide în web. CAP_PLATFORM=android nu a fost aplicat corect."
  }

  if (-not $json.server -or $json.server.hostname -ne "localhost") {
    Fail "Capacitor Android nu este configurat pe bundle local https://localhost."
  }

  Ok "Capacitor Android verificat: bundle local, fără server.url"
}

Write-Host "=== OXIDAȚII Android Resync ===" -ForegroundColor Cyan

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

Assert-File (Join-Path $root "package.json") "package.json"
Assert-File (Join-Path $root "capacitor.config.ts") "capacitor.config.ts"
Assert-File (Join-Path $root "android\gradlew.bat") "Gradle wrapper"

if (-not (Find-Exe "bun.exe")) { Fail "bun nu este instalat. Instalează Bun și redeschide terminalul." }

if ($root -match '[\s\(\)]') {
  Warn "Calea proiectului are spații/paranteze: $root"
  Warn "Dacă Gradle dă erori ciudate, mută proiectul într-o cale simplă, ex: D:\oxidatii"
}

Repair-MainActivity
Write-GoogleServicesJsonIfAvailable

Info "Curăț artefacte Android/Web vechi care pot ține proiectul desincronizat"
Remove-Item -Recurse -Force `
  (Join-Path $root "dist\spa"),
  (Join-Path $root "android\build"),
  (Join-Path $root "android\.gradle"),
  (Join-Path $root "android\app\build"),
  (Join-Path $root "android\app\src\main\assets\public"),
  (Join-Path $root "android\capacitor-cordova-android-plugins") `
  -ErrorAction SilentlyContinue
Ok "Cache-uri curățate"

if (-not $SkipInstall) {
  Invoke-Step "Instalez/verific dependențele web" { bun install }
}

$env:CAP_PLATFORM = "android"
$env:BUILD_MODE = "spa"
if (-not $env:SERVER_FN_BASE_URL) { $env:SERVER_FN_BASE_URL = "https://oxidatii.life/_serverFn" }

Invoke-Step "Construiesc SPA-ul local pentru APK" { bun run build:spa }
Invoke-Step "Rulez Capacitor sync Android" { bunx cap sync android }

Repair-MainActivity
Verify-CapacitorAndroidOutput

if ($BundleRelease) {
  Info "Curăț Gradle și construiesc AAB release"
  Push-Location (Join-Path $root "android")
  .\gradlew.bat clean bundleRelease --no-daemon
  $gradleExit = $LASTEXITCODE
  Pop-Location
  if ($gradleExit -ne 0) { Fail "Gradle bundleRelease a eșuat. Trimite ultimele linii din log dacă mai apare eroare." }

  $aab = Join-Path $root "android\app\build\outputs\bundle\release\app-release.aab"
  Assert-File $aab "AAB release"
  Ok "AAB gata: $aab"
}

Write-Host ""
Ok "Resync complet. Android este pe bundle local, MainActivity e corect, iar fișierele Capacitor au fost regenerate."
Write-Host "Pentru release complet: bun run android:resync:release" -ForegroundColor Cyan