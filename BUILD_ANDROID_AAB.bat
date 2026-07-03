@echo off
setlocal
cd /d "%~dp0"
echo Pornesc tot: inject config, build AAB semnat si upload Google Play daca secretul exista...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\android-play-release.ps1"
echo.
echo Daca a aparut o eroare, copiaza textul rosu si trimite-mi-l.
pause
