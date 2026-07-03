# Oxidatii – Android setup automat (Windows)
# Rulează din root-ul proiectului:  powershell -ExecutionPolicy Bypass -File scripts\android-setup.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== Oxidatii Android setup ===" -ForegroundColor Cyan

# 1. Verifică path
$here = (Get-Location).Path
if ($here -match '[\s\(\)]') {
    Write-Host "ATENȚIE: path-ul proiectului conține spații/paranteze:" -ForegroundColor Yellow
    Write-Host "  $here" -ForegroundColor Red
    Write-Host "Dacă Gradle crapă, mută proiectul într-o cale simplă, ex: D:\oxidatii" -ForegroundColor Yellow
}

# 2. Verifică bun
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Host "EROARE: bun nu e instalat. Instalează de la https://bun.sh" -ForegroundColor Red
    exit 1
}

# 3. Curăță build-uri vechi care pot bloca gradle
Write-Host "-> Curăț build cache vechi..." -ForegroundColor Cyan
Remove-Item -Recurse -Force android\build, android\.gradle, android\app\build -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android\capacitor-cordova-android-plugins -ErrorAction SilentlyContinue

# 4. Instalează + build web
Write-Host "-> bun install..." -ForegroundColor Cyan
bun install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "-> bun run build (dist/client)..." -ForegroundColor Cyan
bun run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 5. Capacitor sync – regenerează android/capacitor-cordova-android-plugins/
Write-Host "-> bunx cap sync android..." -ForegroundColor Cyan
bunx cap sync android
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 6. Warning google-services.json
if (-not (Test-Path "android\app\google-services.json")) {
    Write-Host "WARN: android\app\google-services.json lipsește." -ForegroundColor Yellow
    Write-Host "     Push notifications nu vor merge. Descarcă din Firebase Console" -ForegroundColor Yellow
    Write-Host "     și pune-l în android\app\google-services.json inainte de build release." -ForegroundColor Yellow
}

# 7. Deschide Android Studio
Write-Host "-> Deschid Android Studio..." -ForegroundColor Cyan
bunx cap open android

Write-Host ""
Write-Host "GATA. In Android Studio:" -ForegroundColor Green
Write-Host "  - asteapta Gradle sync (bara de jos)" -ForegroundColor Green
Write-Host "  - Build -> Generate Signed App Bundle -> AAB" -ForegroundColor Green
Write-Host "  - sau automat:  bun run android:release" -ForegroundColor Green

