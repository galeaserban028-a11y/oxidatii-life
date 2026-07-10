#!/usr/bin/env bash
set -euo pipefail

RED=$'\033[0;31m'; GRN=$'\033[0;32m'; YLW=$'\033[1;33m'; NC=$'\033[0m'

echo "============================================================"
echo "  OXIDATII - RUN ALL"
echo "  Injecteaza secrete + Build AAB semnat + Gata de urcat"
echo "============================================================"

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# Load .env.local if present
if [ -f ".env.local" ]; then
  echo "${YLW}[INFO]${NC} Incarc .env.local"
  set -a; . ./.env.local; set +a
fi

# Preflight
command -v node >/dev/null || { echo "${RED}Node lipseste${NC}"; exit 1; }
command -v bun  >/dev/null || { echo "${RED}Bun lipseste (npm i -g bun)${NC}"; exit 1; }
[ -n "${JAVA_HOME:-}" ]     || { echo "${RED}JAVA_HOME nu e setat (JDK 21)${NC}"; exit 1; }
[ -n "${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}" ] || { echo "${RED}ANDROID_HOME / ANDROID_SDK_ROOT nu e setat${NC}"; exit 1; }

bash "$ROOT/scripts/run-all.sh"

echo "${GRN}============================================================${NC}"
echo "${GRN} GATA! AAB: android/app/build/outputs/bundle/release/app-release.aab${NC}"
echo "${GRN}============================================================${NC}"
