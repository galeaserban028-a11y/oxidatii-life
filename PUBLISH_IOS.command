# PUBLICH.command — dublu-click de pe Mac ca să publici pe App Store
#!/usr/bin/env bash
cd "$(dirname "$0")"
./scripts/ios-publish.sh
echo ""
read -p "Apasă Enter ca să închizi..."
