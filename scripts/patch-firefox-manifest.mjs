/**
 * Normalize Firefox MV3 `background.scripts` after CRXJS build:
 * - Chrome-target CRX may emit only `service_worker`; Firefox needs `scripts`.
 * - Firefox-target CRX may emit only `scripts`; ensure a single worker entry.
 * Strip `service_worker` — Firefox ignores it (see web-ext BACKGROUND_SERVICE_WORKER_IGNORED).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = path.join(root, 'dist-firefox', 'manifest.json')

const raw = fs.readFileSync(manifestPath, 'utf8')
const manifest = JSON.parse(raw)

const bg = manifest.background
if (!bg || typeof bg !== 'object') {
  console.error('patch-firefox-manifest: missing background')
  process.exit(1)
}

const worker =
  typeof bg.service_worker === 'string'
    ? bg.service_worker
    : Array.isArray(bg.scripts) && bg.scripts.length > 0
      ? bg.scripts[0]
      : null

if (!worker) {
  console.error(
    'patch-firefox-manifest: missing background.service_worker and background.scripts',
  )
  process.exit(1)
}

// Firefox MV3 uses `background.scripts`; `service_worker` is ignored and upsets web-ext lint.
manifest.background = {
  ...bg,
  scripts: [worker],
}
delete manifest.background.service_worker

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
