#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

npm run build

DEST="$ROOT/safari/SitewipeHost"
mkdir -p "$DEST"

echo "Converting Chrome extension at $ROOT/dist → $DEST"
xcrun safari-web-extension-packager "$ROOT/dist" \
  --swift \
  --no-open \
  --copy-resources \
  --project-location "$DEST" \
  --app-name SitewipeHost

echo "Open the generated Xcode project under safari/SitewipeHost/"
