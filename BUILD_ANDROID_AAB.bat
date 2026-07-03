@echo off
setlocal
cd /d "%~dp0"
echo Pornesc build-ul automat pentru Google Play AAB...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\android-play-release.ps1"
echo.
echo Daca a aparut o eroare, copiaza textul rosu si trimite-mi-l.
pause
