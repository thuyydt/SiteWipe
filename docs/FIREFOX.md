# Firefox build (Sitewipe)

Sitewipe targets Chromium from `npm run build` (`dist/`) and Firefox from `npm run build:firefox` (`dist-firefox/`). Runtime APIs use [`webextension-polyfill`](https://github.com/mozilla/webextension-polyfill) (`browser`) everywhere extension APIs are needed.

## Commands

| Command | Purpose |
|--------|---------|
| `npm run build:firefox` | Typecheck, Vite build with Firefox manifest, patch `manifest.json` for `background.scripts` (required by `web-ext`). |
| `npm run lint:firefox` | Run [`web-ext lint`](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#web-ext-lint) on `dist-firefox/`. |
| `npm run package:firefox` | Build, `web-ext lint`, zip `dist-firefox/` → `release/sitewipe-firefox-amo-v<version>.zip`. |
| `npm run package` | Same as Chrome: runs `package:chrome` and `package:firefox` together. |

## Gecko manifest notes

- Source: [`src/manifest.firefox.ts`](../src/manifest.firefox.ts) (Gecko `id`, `strict_min_version`, `data_collection_permissions.required: ["none"]` per [MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings)).
- Post-process: [`scripts/patch-firefox-manifest.mjs`](../scripts/patch-firefox-manifest.mjs) adds `background.scripts` mirroring `service_worker`, because `@crxjs/vite-plugin` omits it in output JSON.

Replace `sitewipe@sitewipe.github.io` with your stable AMO ID before publishing.

## Local run

```bash
npm run build:firefox
npx web-ext run --source-dir dist-firefox
```

## AMO / signing

- Submit `release/sitewipe-firefox-amo-v<version>.zip` from `npm run package:firefox` (or sign via [addons.mozilla.org](https://addons.mozilla.org/developers/) after bumping version).
- `web-ext lint` may still report warnings (for example `innerHTML` in bundled Vue assets); errors should be resolved before submission.

## Manual QA checklist

1. **Active tab / restricted URLs**: Popup shows restricted message on `about:`, `chrome://`, `addons.mozilla.org`, `moz-extension://`, internal Firefox pages.
2. **Purge**: Preview counts match; selective cookie sweep with whitelist/preserve session; bulk cookie clear via `browsingData`; localStorage whitelist restore path.
3. **Inspect**: Storage CRUD, cookie CRUD (partition metadata where applicable).
4. **Snapshots**: Capture, restore, export/import Base64, compare snapshot vs snapshot / vs live.
5. **Auto snapshots**: Storage tick + `cookies.onChanged` path (logout/login).
6. **Environment injection**: Mock JSON apply + Kill & reload.
