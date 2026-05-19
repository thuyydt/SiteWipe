# Sitewipe

**Mini DevTools for clearing and inspecting site storage** — cookies, `localStorage`, `sessionStorage`, IndexedDB, Cache Storage, and service workers, scoped to the active tab’s origin.

Manifest V3 extension built with **Vue 3**, **TypeScript**, **Vite**, and **[@crxjs/vite-plugin](https://github.com/crxjs/chrome-extension-tools)**. Targets **Chrome**, **Firefox**, and **Safari** (via Xcode conversion).

## Features

| Area | What you can do |
|------|-----------------|
| **Purge** | Clear selected storage types for the current site; optional whitelists for cookie names and `localStorage` keys; impact preview before confirming |
| **Inspect** | Browse and edit storage entries; deep views for cookies, service workers, cache, and IndexedDB (read-only samples) |
| **Profiles** | Save and apply purge “recipes” (presets), with hostname suggestions |
| **Snapshots** | Capture, restore, compare, export/import, and auto-save on storage/cookie changes (per-origin opt-in) |
| **Advanced** | Mock JSON env injection, kill & reload, copy/share helpers |

Open the in-extension **User guide** from the popup (book icon) or `src/doc/index.html` after build.

## Browser support

| Browser | Build output | Notes |
|---------|--------------|--------|
| **Chrome** (and Chromium) | `dist/` | Default `npm run build` |
| **Firefox** | `dist-firefox/` | `browser: 'firefox'` in Vite; post-build manifest patch for `background.scripts` |
| **Safari** | Xcode project under `safari/SitewipeHost/` | Run `npm run safari:convert` after a Chrome build, then open in Xcode |

### Pages where Sitewipe cannot run

Built-in browser pages (`chrome://`, `about:`, etc.), extension stores (e.g. AMO, Chrome Web Store), and some privileged URLs block extension APIs. The popup shows a short explanation instead of raw browser errors.

Use a normal `http://` or `https://` website tab to test purge and inspect features.

## Requirements

- **Node.js** 18+ and **npm**
- **Chrome / Firefox**: load unpacked from `dist/` or `dist-firefox/`
- **Firefox packaging**: [web-ext](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/) (devDependency)
- **Safari**: macOS with **Xcode** and `safari-web-extension-packager` (`xcrun safari-web-extension-packager`)

## Quick start

```bash
git clone https://github.com/thuyydt/SiteWipe.git
cd SiteWipe
npm install
npm run dev
```

Load the extension in the browser’s developer / temporary extension UI and point it at the dev server output (CRXJS HMR) or run a production build first.

### Production builds

```bash
# Chrome / Chromium → dist/
npm run build

# Firefox → dist-firefox/
npm run build:firefox
npm run lint:firefox          # web-ext manifest lint on dist-firefox/

# Store ZIPs (Chrome Web Store + Firefox AMO)
npm run package               # both artifacts under release/
npm run package:chrome        # → release/sitewipe-chrome-store-v<version>.zip
npm run package:firefox       # → release/sitewipe-firefox-amo-v<version>.zip
npm run package:store         # alias for package:chrome

# Safari: refresh Xcode wrapper from latest dist/
npm run build
npm run safari:convert
# Then open safari/SitewipeHost/ in Xcode and run the host app
```

**Store listings:** Copy-paste titles, descriptions, permission justifications, and checklist for Chrome Web Store and Firefox AMO in [`docs/STORE_LISTINGS.md`](docs/STORE_LISTINGS.md). Privacy policy for both stores: [`docs/privacy.html`](docs/privacy.html) (host on GitHub Pages).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server with CRXJS (Chrome manifest) |
| `npm run build` | Typecheck + Chrome build → `dist/` |
| `npm run build:firefox` | Typecheck + Firefox build + `scripts/patch-firefox-manifest.mjs` → `dist-firefox/` |
| `npm run lint:firefox` | `web-ext lint` on `dist-firefox/` |
| `npm run package` | Build + zip Chrome and Firefox store packages in `release/` |
| `npm run package:chrome` | Build + zip `dist/` → `release/sitewipe-chrome-store-v<version>.zip` |
| `npm run package:firefox` | Build, lint, zip `dist-firefox/` → `release/sitewipe-firefox-amo-v<version>.zip` |
| `npm run package:store` | Alias for `package:chrome` |
| `npm run safari:convert` | `safari-web-extension-packager` → `safari/SitewipeHost/` |
| `npm run preview` | Vite preview (popup assets) |

## Project layout

```
sitewipe/
├── src/
│   ├── popup/           # Vue popup UI (fixed 380px width)
│   ├── background/      # Service worker + message handlers
│   ├── content/         # Isolated + MAIN world content scripts
│   ├── views/           # Purge, Inspect, Profiles, Snapshots tabs
│   ├── components/      # Shared UI (tables, modals, panels)
│   ├── injected/        # Functions run via scripting.executeScript
│   ├── lib/             # Schema, permissions, errors, diff helpers
│   ├── doc/             # Static user guide (web_accessible)
│   ├── manifest.ts      # Chrome manifest entry
│   ├── manifest.firefox.ts
│   └── manifest.shared.ts
├── scripts/
│   ├── patch-firefox-manifest.mjs
│   ├── package-chrome-store.sh
│   └── convert-safari-extension.sh
├── vite.config.ts
├── vite.config.firefox.ts
├── icons/
└── safari/SitewipeHost/ # Generated / maintained Xcode host
```

Shared manifest fields live in [`src/manifest.shared.ts`](src/manifest.shared.ts). Firefox-specific Gecko settings are in [`src/manifest.firefox.ts`](src/manifest.firefox.ts).

## Permissions (summary)

- **`activeTab`** — host access when the user opens the popup
- **`host_permissions`** — `http://*/*`, `https://*/*`
- **`storage`**, **`tabs`**, **`scripting`**, **`cookies`**, **`browsingData`**, **`webNavigation`**

Data stays on the device; snapshots and profiles use `chrome.storage.local` (via `webextension-polyfill`).

## Development notes

- **Popup width**: `src/popup/style.css` locks width at **380px** so Firefox does not resize the panel when switching internal tabs (`v-show`).
- **Firefox manifest**: CRXJS with `browser: 'firefox'` omits Chrome-only `use_dynamic_url`; the patch script normalizes `background.scripts` for `web-ext`.
- **Typecheck**: `vue-tsc --noEmit` runs before production builds.

## Version

Current version: **2.0.1** (see `package.json` and manifests).
