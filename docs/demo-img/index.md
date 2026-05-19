# Sitewipe: The Pro DevTools Companion for Site State

**Sitewipe** is the ultimate utility for Web Developers and QA Testers. It allows you to clear, inspect, snapshot, and share per-origin browser state without disrupting your workflow or forcing you to log out.

Instead of wiping your entire browser history or digging through Chrome's DevTools, Sitewipe gives you a sleek, minimalist interface to manage Cookies, LocalStorage, SessionStorage, IndexedDB, and Service Workers in just a few clicks.

### KEY FEATURES

**1. Smart Selective Clear & Whitelists**

* Instantly purge Cookies, LocalStorage, Cache Storage, and Service Workers for the active origin.
* **Whitelist Protection:** Define keys to keep (like `auth_token` or `session_id`) so you can sweep away junk data without losing your login session.
* **Impact Preview:** A built-in dry run shows you exactly what *would* be deleted before you actually confirm, preventing accidental wipes.

**2. Snapshots (Time Machine for Web Data)**

* Save the exact state of a page (Cookies + Storage) and restore it instantly with one click.
* **Auto Snapshots:** Automatically capture the site state whenever `localStorage`, `sessionStorage`, or `cookies` change. It’s like Git for your browser data!
* **Compare & Diff:** View exactly what changed between two snapshots or between a snapshot and the live tab.

**3. Inspect & Edit Inline**

* A focused, lightweight replacement for the DevTools Application panel.
* View, add, edit, and delete `localStorage`, `sessionStorage`, and `cookies` directly from the popup.
* Manage Service Workers, Cache Storage, and IndexedDB effortlessly.

**4. Environment Injection (Share Your State)**

* **"Works on my machine? Send me your machine."** Export your entire site state as a Mock JSON or a Base64 string and send it to a teammate.
* They can instantly inject that payload into their tab to reproduce your exact environment and debug issues faster.

**5. Purge Recipes (Profiles)**

* Save your favorite clear configurations (e.g., "Wipe Cache + SW on localhost") and apply them instantly whenever you visit matching hostnames.

---

### PRIVACY & SECURITY BY DESIGN

* **100% Local:** All snapshots, profiles, and whitelists are stored locally on your machine using `chrome.storage.local`.
* **Zero Tracking:** Sitewipe does not collect, track, or send any of your data to external servers.
* **Safe Scope:** Actions are strictly scoped to the active tab's origin. It safely disables itself on restricted pages like `chrome://` or the Web Store.

---

### WHO IS THIS FOR?

* **Frontend & Full-Stack Developers:** Debug state issues, manage auth tokens, and bypass stubborn Service Worker caches without nuking your whole browser.
* **QA & Testers:** Save hours of repetitive manual testing by taking Snapshots of complex flows and restoring them in one second.

**Sitewipe v2.0.1** — Pure state, one swipe. Install now to upgrade your development workflow!