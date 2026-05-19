#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

npm run build

if [[ ! -f dist/manifest.json ]]; then
  echo "error: dist/manifest.json missing after build" >&2
  exit 1
fi

VERSION="$(node -e "console.log(JSON.parse(require('fs').readFileSync('package.json','utf8')).version)")"
OUT="release/sitewipe-chrome-store-v${VERSION}.zip"

mkdir -p release
rm -f "$OUT"

(
  cd dist
  zip -r "../$OUT" . -x "*.DS_Store" -x "*.map"
)

echo "Chrome Web Store package: $ROOT/$OUT"
