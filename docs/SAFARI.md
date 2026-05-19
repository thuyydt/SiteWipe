# Safari Web Extension (macOS + iOS)

Safari does **not** load an unpacked MV3 ZIP the same way Chrome/Firefox do. Apple expects a **host application** (macOS and/or iOS) produced by Xcode that **embeds** the Web Extension. Use Apple’s CLI **`safari-web-extension-packager`** (from Xcode Command Line Tools, `xcrun safari-web-extension-packager`) or Xcode’s **Convert to Safari Web Extension** flow.

Sitewipe’s shared extension logic lives in this repo (`src/`); Safari packaging is maintained outside Node (`safari/` + Xcode).

## Which build folder to convert?

- **Recommended input:** Chrome output **`dist/`** from `npm run build`. Safari ignores Gecko-only keys; Firefox-only manifest tweaks (`browser_specific_settings`, `background.scripts`) are unnecessary for Safari.
- Avoid feeding **`dist-firefox/`** into Safari unless you strip Gecko fields manually—extra keys can confuse tooling.

## One-shot converter script

From repository root on macOS (requires Xcode):

```bash
./scripts/convert-safari-extension.sh
```

This runs `npm run build`, then `xcrun safari-web-extension-packager` targeting `safari/SitewipeHost/` (see script for flags).

After conversion, open the generated `.xcodeproj` in Xcode, enable the **Safari Web Extension** capability on both **macOS** and **iOS** targets if you ship both, adjust bundle IDs / signing, then **Product → Run**.

The committed macOS host uses **native AppKit onboarding** (see [`Shared (App)/ViewController.swift`](../safari/SitewipeHost/SitewipeHost/Shared%20(App)/ViewController.swift)) instead of `WKWebView`, avoiding WebContent sandbox issues on recent macOS. Extension bundle ID is resolved from the embedded `.appex` at runtime.

## Multi-target layout

Place generated projects under [`safari/SitewipeHost/`](./safari/SitewipeHost/) (see README there). Typical structure after conversion:

- macOS host app + embedded Safari Web Extension (macOS).
- iOS/iPadOS host app + embedded Safari Web Extension (iOS)—enable **Safari Web Extensions** on device and trust your developer certificate.

Exact `.pbxproj` files are generated locally by Apple tooling and are **not** committed here.

## Feature matrix (expectations)

| Area | macOS Safari | iOS / iPadOS Safari |
|------|----------------|----------------------|
| Popup (`default_popup`) | Supported | Supported (mobile UI constraints) |
| MV3 service worker (background) | Supported with OS/browser updates | **Stricter** lifecycle / memory limits |
| `scripting.executeScript` MAIN world | Generally available on recent Safari | Verify per OS version; failures are logged via `[Sitewipe] scripting.executeScript` |
| `browsingData.remove` with `{ origins }` | Usually works for permitted types | May fail or partially apply—watch console warnings from `[Sitewipe] browsingData.remove` |
| `cookies`, `storage`, `tabs` | Broad parity with WebExtensions baseline | Test auth-heavy sites |
| Auto snapshots (storage + `cookies.onChanged`) | Expected to work when background stays alive | May miss events if suspension kicks in |
| Restricted URLs | Includes `safari-web-extension://` handling ([`src/lib/permissions.ts`](../src/lib/permissions.ts)) | Same |

**Tiered support:** aim for **full parity on macOS first**; treat **iOS as best-effort** until you complete device QA. Surface UX degradations (disabled destructive actions) only after measuring real failures—current codebase relies on thrown errors + console warnings from [`src/extension/capabilities.ts`](../src/extension/capabilities.ts).

## Distribution

- **Mac App Store / TestFlight / App Store (iOS):** requires Apple Developer Program membership, correct entitlements, privacy nutrition labels, and extension disclosure URLs (host your privacy policy; see [`docs/privacy.html`](./privacy.html) on GitHub Pages if applicable).
- **Notarized macOS distribution outside MAS:** still needs a signing identity and host app wrapper.

## References

- [Safari Web Extensions](https://developer.apple.com/safari/extensions/)
- [`safari-web-extension-packager`](https://developer.apple.com/documentation/safariservices/safari_web_extensions/converting_a_web_extension_for_safari)
