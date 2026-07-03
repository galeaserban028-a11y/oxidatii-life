@echo off
setlocal
cd /d "%~dp0"
echo Pornesc Oxidatii Android cap-coada...
echo.
echo Face automat: google-services.json din secret, keystore daca lipseste, build AAB semnat, upload Google Play daca exista service account.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\android-play-release.ps1"
echo.
echo Daca a aparut o eroare, copiaza textul rosu si trimite-mi-l.
pause