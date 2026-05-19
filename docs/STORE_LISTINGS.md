# Sitewipe — Store listing copy (Chrome & Firefox)

Copy-paste content for **Chrome Web Store** and **Firefox Add-ons (AMO)**. Version **2.0.1** unless you bump `package.json` before submit.

---

## Shared metadata (both stores)

| Field | Value |
|-------|--------|
| **Extension name** | Sitewipe |
| **Tagline** | Mini DevTools for site storage |
| **Developer** | thuydtshop |
| **Support email** | thuydtshop@gmail.com |
| **Homepage** | https://thuyydt.github.io/SiteSwipe/ |
| **Privacy policy URL** | https://thuyydt.github.io/SiteSwipe/privacy.html |
| **User guide** | https://thuyydt.github.io/SiteSwipe/guide.html |
| **Support / issues** | https://github.com/thuyydt/SiteSwipe/issues |
| **Source code** | https://github.com/thuyydt/SiteSwipe |
| **License** | MIT ([LICENSE](../LICENSE) in repo) |

---

## Chrome Web Store

### Package to upload

```text
release/sitewipe-chrome-store-v2.0.1.zip
```

Build: `npm run package:chrome`

### Listing fields

**Name**

```text
Sitewipe
```

**Short description** (max 132 characters — current length: 108)

```text
Clear, inspect, snapshot & share per-site storage—cookies, localStorage, IndexedDB & more. For devs & QA.
```

**Detailed description**

```text
Sitewipe — Pure state, one swipe.

Manage cookies, localStorage, sessionStorage, IndexedDB, Cache Storage, and service workers for the current website only—without wiping your entire browser profile or forcing a logout.

WHO IT'S FOR
• Developers debugging auth, cache, and service worker issues
• QA and testers who need to reset or restore site state between runs

FEATURES

Purge
• Selectively clear storage types per origin
• Whitelist cookie names and localStorage keys to keep sessions while removing junk
• Impact preview shows what would be deleted before you confirm

Inspect
• Browse and edit localStorage, sessionStorage, and cookies inline
• Overview of service workers, Cache Storage, and IndexedDB (read-only samples)

Snapshots
• Capture and restore cookies + storage for one origin
• Compare two snapshots or snapshot vs live tab
• Optional auto-snapshots when storage or cookies change (per-origin, opt-in)
• Export/import snapshots for teammates

Purge recipes (Profiles)
• Save purge presets (toggles + whitelists) and apply when hostnames match

Advanced
• Export Mock JSON or Base64 snapshot strings
• Inject a captured environment into another tab
• Kill & reload for a hard reset of the current origin

PRIVACY
• 100% local: snapshots and settings stay in your browser only
• No analytics, no telemetry, no remote servers
• Actions are scoped to the active tab’s origin

User guide: https://thuyydt.github.io/SiteSwipe/guide.html
Privacy policy: https://thuyydt.github.io/SiteSwipe/privacy.html
Support: thuydtshop@gmail.com
```

**Category**

```text
Developer Tools
```

(Alternate if needed: Productivity)

**Language**

```text
English
```

### Single purpose (Chrome review)

```text
Sitewipe provides per-origin browser storage management for the website in the user’s active tab. The extension lets users inspect, edit, purge, snapshot, and restore cookies and web storage (localStorage, sessionStorage, IndexedDB, cache, service workers) for that single origin only. It does not replace a full browser or general browsing experience; every action is initiated by the user from the toolbar popup and applies only to the current site.
```

### Permission justifications

Use these in the Chrome Web Store “Privacy” / permission justification forms.

| Permission | Justification |
|------------|----------------|
| `storage` | Save extension settings, purge recipe presets, and snapshot metadata locally on the device. No data is sent to external servers. |
| `tabs` | Read the active tab’s URL and title so purge, inspect, and snapshot actions apply to the correct origin. |
| `scripting` | Inject scripts on the active page to read and modify localStorage/sessionStorage and to probe IndexedDB/cache when the user uses Inspect or Purge. |
| `cookies` | List, edit, and delete cookies for the active site when the user runs Purge or Inspect. |
| `browsingData` | Remove selected browsing data types (cookies, cache, IndexedDB, etc.) for one origin when the user confirms a purge. |
| `webNavigation` | Support navigation-related flows tied to the active tab context (extension lifecycle on page loads). |
| `activeTab` | Grant temporary access to the active tab’s origin when the user opens the popup, so storage can be read without permanent broad access until invoked. |
| Host: `http://*/*`, `https://*/*` | Users test arbitrary dev, staging, and production URLs. Sitewipe only acts on the origin of the tab the user is viewing; host permission does not imply background access to all sites without user action. |

### Data use / privacy practices (Chrome)

```text
• No user data is collected, sold, or transferred to third parties.
• No remote servers or analytics.
• Snapshots, profiles, and preferences are stored locally in chrome.storage.local on the user’s device.
• Site storage and cookies are accessed only when the user triggers Purge, Inspect, Snapshot, or related features on the active tab.
```

### Screenshots

Use images from `docs/demo-img/` (resize if needed):

| File | Suggested caption |
|------|-------------------|
| `1.png` | Purge tab — selective clear and live counts |
| `2.png` | Inspect — storage and cookies in one place |
| `3.png` | Snapshots — capture and restore |
| `4.png` | Compare — diff snapshots or vs live |
| `5.png` | Recipes and advanced tools |

Chrome prefers **1280×800** or **640×400** PNG/JPEG. Icon: `icons/extension_icon128.png`.

---

## Firefox Add-ons (AMO)

### Package to upload

```text
release/sitewipe-firefox-amo-v2.0.1.zip
```

Build: `npm run package:firefox` (runs build, `web-ext lint`, then zip)

### Listing fields

**Add-on name**

```text
Sitewipe
```

**Add-on ID** (do not change for updates)

```text
sitewipe@sitewipe.github.io
```

**Summary** (max 250 characters — current length: 198)

```text
Privacy-first tool to purge, inspect, snapshot & restore per-site storage (cookies, localStorage, IndexedDB)—without clearing your whole profile. For developers & QA.
```

**Description** (AMO supports HTML/markdown)

```text
Sitewipe — Mini DevTools for site storage

Clear, inspect, snapshot, and share browser state for one website at a time—without wiping your whole profile or forcing a logout.

Built for developers and QA on Firefox.

Features

• Purge — Selectively clear cookies, localStorage, sessionStorage, IndexedDB, cache, and service workers per origin. Whitelists and impact preview before you confirm.

• Inspect — Edit storage and cookies; browse service workers, Cache Storage, and IndexedDB samples.

• Snapshots — Capture, restore, compare, and export/import state. Optional auto-snapshots when storage or cookies change (per-origin).

• Purge recipes — Save and apply purge presets when hostnames match.

• Advanced — Mock JSON export/import, environment injection, kill & reload.

Privacy

• No data collection (declared in manifest: none).
• No analytics or remote servers.
• Snapshots and settings stay in browser.storage.local on your device only.

Links

Homepage: https://thuyydt.github.io/SiteSwipe/
Guide: https://thuyydt.github.io/SiteSwipe/guide.html
Privacy: https://thuyydt.github.io/SiteSwipe/privacy.html
Support: thuydtshop@gmail.com
Source: https://github.com/thuyydt/SiteSwipe
```

**Categories**

```text
Development
Web Development
```

**License** (AMO dropdown)

```text
MIT
```

**Data collection** (AMO)

```text
None
```

Matches `browser_specific_settings.gecko.data_collection_permissions.required: ["none"]` in the Firefox manifest.

**Privacy policy URL**

```text
https://thuyydt.github.io/SiteSwipe/privacy.html
```

**Support email**

```text
thuydtshop@gmail.com
```

**Homepage**

```text
https://thuyydt.github.io/SiteSwipe/
```

### Screenshots

Same assets as Chrome (`docs/demo-img/1.png`–`5.png`). Follow AMO image guidelines in the developer hub.

---

## Pre-submission checklist

- [ ] Bump version in `package.json`, manifests, and store copy if releasing a new version
- [ ] `npm run package` → verify both ZIPs under `release/`
- [ ] `npm run lint:firefox` — resolve errors (warnings such as bundled `innerHTML` may remain)
- [ ] Test on a normal `https://` page: Purge, Inspect, Snapshot
- [ ] GitHub Pages serves `docs/` so privacy and homepage URLs work
- [ ] Upload screenshots at required sizes
- [ ] Paste privacy policy URL on both dashboards
- [ ] Chrome: complete permission justification fields
- [ ] Firefox: confirm license MIT and data collection **None**

---

## Version history (listing notes)

**2.0.1** — Smart selective clear, impact preview, purge recipes, snapshot compare, auto-snapshots (storage + cookies), environment injection, user guide.
