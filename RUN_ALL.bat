@echo off
setlocal EnableDelayedExpansion
title Oxidatii - RUN ALL (Android AAB)
color 0A

echo ============================================================
echo   OXIDATII - RUN ALL
echo   Injecteaza secrete + Build AAB semnat + Gata de urcat
echo ============================================================
echo.

REM --- 0. Verifica path fara spatii / paranteze ---
echo %CD% | findstr /R /C:"[ ()]" >nul
if not errorlevel 1 (
  echo [EROARE] Calea proiectului contine spatii sau paranteze:
  echo   %CD%
  echo Muta proiectul intr-un folder simplu, ex: C:\dev\oxidatii
  pause
  exit /b 1
)

REM --- 1. Verifica tool-uri necesare ---
where node >nul 2>&1 || (echo [EROARE] Node.js lipseste. Instaleaza de la https://nodejs.org & pause & exit /b 1)
where bun >nul 2>&1 || (echo [EROARE] Bun lipseste. Ruleaza: npm i -g bun & pause & exit /b 1)
if not defined JAVA_HOME (echo [EROARE] JAVA_HOME nu e setat. Instaleaza JDK 17 si seteaza JAVA_HOME. & pause & exit /b 1)
if not defined ANDROID_HOME if not defined ANDROID_SDK_ROOT (
  echo [EROARE] ANDROID_HOME / ANDROID_SDK_ROOT nu e setat.
  pause & exit /b 1
)

REM --- 2. Incarca .env.local daca exista (pentru secrete locale) ---
if exist ".env.local" (
  echo [INFO] Incarc .env.local ...
  for /f "usebackq tokens=1,* delims==" %%A in (".env.local") do (
    set "line=%%A"
    if not "!line:~0,1!"=="#" if not "%%A"=="" set "%%A=%%B"
  )
)

REM --- 3. Ruleaza pipeline PowerShell (face restul) ---
echo.
echo [PAS] Rulez pipeline-ul complet...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run-all.ps1"
set "RC=%ERRORLEVEL%"

echo.
if "%RC%"=="0" (
  color 0A
  echo ============================================================
  echo   GATA! AAB semnat este in:
  echo   android\app\build\outputs\bundle\release\app-release.aab
  echo ============================================================
) else (
  color 0C
  echo ============================================================
  echo   ESUAT (cod %RC%). Copiaza textul rosu de mai sus.
  echo ============================================================
)
pause
exit /b %RC%
