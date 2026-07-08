#!/usr/bin/env bash
# Dublu-click de pe Mac ca să publici pe App Store
cd "$(dirname "$0")"
./scripts/ios-publish.sh
echo ""
read -p "Apasă Enter ca să închizi..."
