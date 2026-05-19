# Safari wrapper (Xcode)

Apple tooling generates the macOS/iOS host apps and embedded Safari Web Extension targets. Nothing in this folder is produced by `npm`; run the converter after a Chrome build.

## Generate or refresh the Xcode project

```bash
# From repository root
./scripts/convert-safari-extension.sh
```

Or manually:

```bash
npm run build
xcrun safari-web-extension-packager "$(pwd)/dist" \
  --swift \
  --no-open \
  --copy-resources \
  --project-location "$(pwd)/safari/SitewipeHost" \
  --app-name SitewipeHost
```

Flags vary by Xcode version; run `xcrun safari-web-extension-packager --help`.

## Next steps in Xcode

1. Open the new `.xcodeproj` under `safari/SitewipeHost/`.
2. Set **Team**, **bundle identifiers**, and **version** for macOS app, iOS app (if present), and extension targets.
3. Enable **Safari Web Extension** capability where offered.
4. Run on **My Mac** (Safari → Develop → Allow Unsigned Extensions while debugging) and on a **physical iOS device** for extension sidebar testing.

### macOS host onboarding

The macOS app uses **native AppKit UI** (not `WKWebView`) so onboarding works under App Sandbox on recent macOS. The extension bundle ID is read from the embedded `SitewipeHost Extension.appex` at runtime—if you change the extension target’s bundle ID in Xcode, no Swift edit is required.

**QA:** Run the macOS scheme → window shows status text and **Quit and Open Safari Settings…** → click opens Safari extension settings and quits the host → enable the extension → test the popup on a normal `https://` page.

Re-run the converter when MV3 assets change substantially; merge any manual Xcode edits carefully (especially `Shared (App)/ViewController.swift`).
