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
  $candidates = @()
  if ($env:JAVA_HOME) { $candidates += (Join-Path $env:JAVA_HOME "bin\keytool.exe") }
  $candidates += "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe"
  $candidates += "C:\Program Files\Android\Android Studio\jre\bin\keytool.exe"
  $direct = Find-Exe "keytool.exe"
  if ($direct) { $candidates += $direct }

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) { return $candidate }
  }
  return $null
}

function Get-JavaMajor($javaExe) {
  if (-not $javaExe -or -not (Test-Path $javaExe)) { return $null }
  # java -version writes to stderr; with $ErrorActionPreference=Stop that becomes a terminating error.
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = & $javaExe -XshowSettings:properties -version 2>&1 | ForEach-Object { "$_" } | Out-String
  } catch {
    $output = "$_"
  } finally {
    $ErrorActionPreference = $prev
  }
  if ($output -match 'java\.specification\.version\s*=\s*(\d+)') { return $Matches[1] }
  if ($output -match 'version "(\d+)') { return $Matches[1] }
  return $null
}

function Use-Jdk21 {
  $candidates = @()
  if ($env:JAVA_HOME) { $candidates += (Join-Path $env:JAVA_HOME "bin\java.exe") }
  $candidates += "C:\Program Files\Android\Android Studio\jbr\bin\java.exe"
  $candidates += "C:\Program Files\Eclipse Adoptium\jdk-21\bin\java.exe"
  $candidates += "C:\Program Files\Java\jdk-21\bin\java.exe"

  foreach ($java in $candidates) {
    if ((Get-JavaMajor $java) -eq "21") {
      $jdkHome = Split-Path (Split-Path $java -Parent) -Parent
      $env:JAVA_HOME = $jdkHome
      $env:PATH = "$jdkHome\bin;$env:PATH"
      Ok "JDK 21 activ: $jdkHome"
      return
    }
  }

  Fail "Este necesar JDK 21 pentru Capacitor 8. Instalează JDK 21 sau setează JAVA_HOME la C:\Program Files\Android\Android Studio\jbr."
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

# Prefer D: build caches when C: is full (common on this machine).
if (-not $env:GRADLE_USER_HOME) {
  $gradleHome = "D:\oxi-build\gradle-home"
  New-Item -ItemType Directory -Force -Path $gradleHome | Out-Null
  $env:GRADLE_USER_HOME = $gradleHome
  Info "GRADLE_USER_HOME=$gradleHome"
}
if (-not $env:TEMP -or ((Get-PSDrive C).Free -lt 2GB)) {
  $tmp = "D:\oxi-build\tmp"
  New-Item -ItemType Directory -Force -Path $tmp | Out-Null
  $env:TEMP = $tmp
  $env:TMP = $tmp
  Info "TEMP/TMP=$tmp (C: low space)"
}

if ($root -match '[\s\(\)]') {
  Warn "Calea proiectului are spații/paranteze: $root"
  Warn "Dacă Gradle dă erori ciudate, mută folderul în D:\oxidatii și rulează din nou. Scriptul continuă totuși."
}

Use-Jdk21

if (-not (Find-Exe "bun.exe")) { Fail "bun nu este instalat. Instalează Bun de la https://bun.sh, apoi redeschide terminalul." }

$androidHome = $env:ANDROID_HOME
if (-not $androidHome) { $androidHome = $env:ANDROID_SDK_ROOT }
if (-not $androidHome -and -not (Test-Path "android\local.properties")) {
  Warn "Nu găsesc ANDROID_HOME/ANDROID_SDK_ROOT sau android\local.properties. Dacă build-ul pică, deschide o dată proiectul în Android Studio ca să instaleze SDK-ul."
}

$keystoreProps = "android\keystore.properties"
$keystorePath = $env:OXIDATII_KEYSTORE_PATH
$hasEnvSigning = $env:OXIDATII_KEYSTORE_PATH -and $env:OXIDATII_KEYSTORE_PASSWORD -and $env:OXIDATII_KEY_ALIAS -and $env:OXIDATII_KEY_PASSWORD

# Never auto-overwrite an existing keystore.properties (user/Play keystore).
if (-not $hasEnvSigning -and -not (Test-Path $keystoreProps)) {
  Info "Nu exista semnare release. Generez automat android\oxidatii-release.jks + android\keystore.properties"
  $keytool = Find-Keytool
  if (-not $keytool) { Fail "Nu gasesc keytool. Instaleaza JDK 21 sau seteaza JAVA_HOME catre JDK 21 / Android Studio jbr." }

  $storePass = New-Password
  # JDK 21 PKCS12 ignores separate keypass — must match store password.
  $keyPass = $storePass
  $jks = (Join-Path $root "android\oxidatii-release.jks")

  & $keytool -genkeypair -v -keystore $jks -alias oxidatii -keyalg RSA -keysize 2048 -validity 10000 -storepass $storePass -keypass $keyPass -dname "CN=OXIDATII, OU=Mobile, O=OXIDATII, L=Bucharest, ST=Bucharest, C=RO"
  if ($LASTEXITCODE -ne 0) { Fail "keytool nu a putut genera keystore-ul." }

  # storeFile MUST be relative to android/ — Java Properties treats \ as escape.
  @"
# Generat automat de scripts/android-play-release.ps1
# NU sterge si NU publica acest fisier. Ai nevoie de acelasi keystore pentru update-uri in Google Play.
storeFile=oxidatii-release.jks
storePassword=$storePass
keyAlias=oxidatii
keyPassword=$storePass
"@ | Set-Content -Encoding ascii $keystoreProps

  Ok "Keystore release generat. Fa backup la android\oxidatii-release.jks si android\keystore.properties."
} elseif (Test-Path $keystoreProps) {
  Ok "Folosesc keystore existent din android\keystore.properties (nu regenerat)."
}

Write-GoogleServicesJson

Info "Curăț build cache Android vechi"
Remove-Item -Recurse -Force android\build, android\.gradle, android\app\build -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android\capacitor-cordova-android-plugins -ErrorAction SilentlyContinue

Info "Instalez dependențe web"
bun install
if ($LASTEXITCODE -ne 0) { Fail "bun install a eșuat." }

Info "Construiesc aplicația Android locală (SPA, fără server.url / web extern)"
if (-not $env:SERVER_FN_BASE_URL) { $env:SERVER_FN_BASE_URL = "https://oxidatii.life/_serverFn" }
$env:BUILD_MODE = "spa"
bun run build:spa
if ($LASTEXITCODE -ne 0) { Fail "bun run build:spa a eșuat. Rezolvă eroarea afișată mai sus." }

Info "Sincronizez Capacitor Android"
$env:CAP_PLATFORM = "android"
# Windows: bunx is often missing from PATH; "bun x" always works with Bun.
bun x cap sync android
if ($LASTEXITCODE -ne 0) { Fail "cap sync android a esuat." }

# Guardrails: AAB must ship the SPA shell, never the Lovable redirect stub.
$publicIndex = Join-Path $root "android\app\src\main\assets\public\index.html"
$capCfg = Join-Path $root "android\app\src\main\assets\capacitor.config.json"
if (-not (Test-Path $publicIndex)) { Fail "Lipsa assets/public/index.html dupa cap sync." }
$indexText = Get-Content -Raw $publicIndex
$hasLovableStub = ($indexText -match "oxidatii\.lovable\.app") -and ($indexText -notmatch "assets/")
if ($hasLovableStub) {
  Fail "index.html e stub-ul Lovable (location.replace). Ruleaza build:spa cu CAP_PLATFORM=android."
}
if ($indexText -notmatch "\./assets/") {
  Fail "index.html nu are path-uri relative ./assets/ - postbuild-spa nu a rulat corect."
}
# Absolute import("/assets/...") breaks Capacitor WebView on some devices.
if ([regex]::IsMatch($indexText, 'import\(["'']\/assets/')) {
  Fail "index.html inca are import('/assets/...') absolut - WebView Play poate da 404."
}
if (-not (Test-Path $capCfg)) { Fail "Lipsa capacitor.config.json in assets." }
$cfgText = Get-Content -Raw $capCfg
if ([regex]::IsMatch($cfgText, '"url"\s*:')) {
  Fail "capacitor.config.json contine server.url - AAB-ul ar incarca web remote, nu bundle-ul local."
}

# Same absolute /assets/ bug that made sideload APK "OK" and Play AAB broken (logo etc.).
$publicAssets = Join-Path $root "android\app\src\main\assets\public"
$absAssetHits = @()
Get-ChildItem -Path $publicAssets -Recurse -Include *.js,*.css,*.html -ErrorAction SilentlyContinue | ForEach-Object {
  if (-not $_.PSIsContainer -and $_.Length -gt 0) {
    $txt = Get-Content -Raw -LiteralPath $_.FullName -ErrorAction SilentlyContinue
    if ($txt -and [regex]::IsMatch($txt, '["''(=]/assets/')) {
      $absAssetHits += $_.FullName.Substring($publicAssets.Length + 1)
    }
  }
}
if ($absAssetHits.Count -gt 0) {
  $sample = ($absAssetHits | Select-Object -First 8) -join ", "
  Fail "Bundle inca are path-uri absolute /assets/ (APK!=AAB pe Play): $sample"
}
Ok "SPA index.html + capacitor.config.json + zero /assets/ absolute - OK pentru Play/AAB"

if (-not $env:ANDROID_VERSION_CODE) {
  $env:ANDROID_VERSION_CODE = "5"
  Info "ANDROID_VERSION_CODE = $($env:ANDROID_VERSION_CODE)"
}
if (-not $env:ANDROID_VERSION_NAME) {
  $env:ANDROID_VERSION_NAME = "1.1.1"
  Info "ANDROID_VERSION_NAME = $($env:ANDROID_VERSION_NAME)"
}
Info "Construiesc AAB + APK release semnate din ACELASI sync (versionCode=$($env:ANDROID_VERSION_CODE) name=$($env:ANDROID_VERSION_NAME))"
Push-Location android
.\gradlew.bat bundleRelease assembleRelease --no-daemon
$gradleExit = $LASTEXITCODE
Pop-Location
if ($gradleExit -ne 0) { Fail "Gradle bundleRelease/assembleRelease a eșuat. Copiază ultimele 30 de linii din eroare și trimite-mi-le." }

$aab = Join-Path $root "android\app\build\outputs\bundle\release\app-release.aab"
$apk = Join-Path $root "android\app\build\outputs\apk\release\app-release.apk"
if (-not (Test-Path $aab)) { Fail "Build-ul a terminat, dar nu găsesc AAB-ul la $aab" }
if (-not (Test-Path $apk)) { Fail "Build-ul a terminat, dar nu găsesc APK-ul la $apk" }

Ok "AAB gata: $aab"
Ok "APK gata (același web bundle): $apk"

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
