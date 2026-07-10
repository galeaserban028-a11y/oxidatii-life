@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
echo Pornesc Oxidatii Android cap-coada...
echo.
echo Face automat: google-services.json din secret, keystore daca lipseste, build AAB semnat, upload Google Play daca exista service account.
echo.

REM === Verificare JDK 17 ===
set "JAVA_BIN=java"
if defined JAVA_HOME if exist "%JAVA_HOME%\bin\java.exe" set "JAVA_BIN=%JAVA_HOME%\bin\java.exe"

"%JAVA_BIN%" -version >nul 2>&1
if errorlevel 1 (
  echo [EROARE] Java nu este instalat sau nu e in PATH.
  echo Instaleaza JDK 17 ^(Temurin/Adoptium^): https://adoptium.net/temurin/releases/?version=17
  echo Apoi seteaza JAVA_HOME catre folderul JDK 17 si redeschide fereastra.
  pause
  exit /b 1
)

for /f "tokens=2 delims==" %%V in ('"%JAVA_BIN%" -XshowSettings:properties -version 2^>^&1 ^| findstr /C:"java.specification.version"') do (
  set "JAVA_MAJOR=%%V"
)
set "JAVA_MAJOR=!JAVA_MAJOR: =!"

if not "!JAVA_MAJOR!"=="17" (
  echo [EROARE] Versiune Java gresita: !JAVA_MAJOR!. Este necesar JDK 17.
  echo.
  "%JAVA_BIN%" -version
  echo.
  echo JAVA_HOME actual: %JAVA_HOME%
  echo.
  echo Instaleaza JDK 17 de la: https://adoptium.net/temurin/releases/?version=17
  echo Apoi seteaza JAVA_HOME catre folderul JDK 17 si redeschide fereastra.
  pause
  exit /b 1
)

echo [OK] JDK 17 detectat ^(JAVA_HOME=%JAVA_HOME%^).
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
