@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
echo Pornesc Oxidatii Android cap-coada...
echo.
echo Face automat: google-services.json din secret, keystore daca lipseste, build AAB semnat, upload Google Play daca exista service account.
echo.

REM === Verificare JDK 21 (necesar pentru Capacitor 8 / Android) ===
set "JAVA_BIN=java"
if defined JAVA_HOME if exist "%JAVA_HOME%\bin\java.exe" set "JAVA_BIN=%JAVA_HOME%\bin\java.exe"

call :DetectJavaMajor "%JAVA_BIN%"
if not "!JAVA_MAJOR!"=="21" (
  if exist "C:\Program Files\Android\Android Studio\jbr\bin\java.exe" (
    call :DetectJavaMajor "C:\Program Files\Android\Android Studio\jbr\bin\java.exe"
    if "!JAVA_MAJOR!"=="21" (
      set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
      set "JAVA_BIN=!JAVA_HOME!\bin\java.exe"
      set "PATH=!JAVA_HOME!\bin;!PATH!"
    )
  )
)

"%JAVA_BIN%" -version >nul 2>&1
if errorlevel 1 (
  echo [EROARE] Java nu este instalat sau nu e in PATH.
  echo Instaleaza JDK 21 ^(Temurin/Adoptium^) sau foloseste Java din Android Studio.
  echo Link: https://adoptium.net/temurin/releases/?version=21
  echo Apoi seteaza JAVA_HOME catre folderul JDK 21 si redeschide fereastra.
  pause
  exit /b 1
)

call :DetectJavaMajor "%JAVA_BIN%"

if not "!JAVA_MAJOR!"=="21" (
  echo [EROARE] Versiune Java gresita: !JAVA_MAJOR!. Este necesar JDK 21 pentru Capacitor 8.
  echo.
  "%JAVA_BIN%" -version
  echo.
  echo JAVA_HOME actual: %JAVA_HOME%
  echo.
  echo Instaleaza JDK 21 de la: https://adoptium.net/temurin/releases/?version=21
  echo Sau seteaza JAVA_HOME la: C:\Program Files\Android\Android Studio\jbr
  echo Apoi redeschide fereastra si ruleaza din nou.
  pause
  exit /b 1
)

echo [OK] JDK 21 detectat ^(JAVA_HOME=%JAVA_HOME%^).
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\android-play-release.ps1"
set "RC=%ERRORLEVEL%"
echo.
if not "%RC%"=="0" (
  echo Build-ul a esuat ^(cod %RC%^). Copiaza textul rosu si trimite-mi-l.
) else (
  echo Gata! AAB: android\app\build\outputs\bundle\release\app-release.aab
)
pause
exit /b %RC%

:DetectJavaMajor
set "JAVA_MAJOR="
for /f "tokens=2 delims==" %%V in ('"%~1" -XshowSettings:properties -version 2^>^&1 ^| findstr /C:"java.specification.version"') do (
  set "JAVA_MAJOR=%%V"
)
set "JAVA_MAJOR=!JAVA_MAJOR: =!"
exit /b 0
