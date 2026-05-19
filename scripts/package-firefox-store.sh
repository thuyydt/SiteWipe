#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

npm run build:firefox
npm run lint:firefox

if [[ ! -f dist-firefox/manifest.json ]]; then
  echo "error: dist-firefox/manifest.json missing after build" >&2
  exit 1
fi

VERSION="$(node -e "console.log(JSON.parse(require('fs').readFileSync('package.json','utf8')).version)")"
OUT="release/sitewipe-firefox-amo-v${VERSION}.zip"

mkdir -p release
rm -f "$OUT"

(
  cd dist-firefox
  zip -r "../$OUT" . -x "*.DS_Store" -x "*.map"
)

echo "Firefox AMO package: $ROOT/$OUT"
