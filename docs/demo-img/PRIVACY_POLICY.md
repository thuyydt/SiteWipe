# Privacy Policy for Sitewipe

**Last Updated: May 12, 2026**

Sitewipe ("we," "our," or "the Extension") is committed to protecting your privacy. This Privacy Policy explains how we handle data within the Sitewipe Chrome Extension.

### 1. Data Collection and Transmission

Sitewipe is designed with a **privacy-first** approach:

* **No Personal Data Collection**: We do not collect, store, or transmit any personally identifiable information (PII).
* **No External Communication**: The Extension does not communicate with any external servers or third-party APIs.
* **Zero Tracking**: We do not use analytics, tracking pixels, or any form of telemetry to monitor your browsing behavior.

### 2. How Data is Processed

To provide its core functionality, Sitewipe interacts with the following data on the active origin:

* **Browser State**: The Extension accesses Cookies, LocalStorage, SessionStorage, IndexedDB, Cache Storage, and Service Workers only when you trigger an action (e.g., Purge, Inspect, or Snapshot).
* **Snapshots & Profiles**: Any data captured via the "Snapshots" or "Purge Recipes" features is stored exclusively in your browser's local storage (`chrome.storage.local`).
* **Auto-Snapshots**: If enabled, the Extension monitors storage changes locally to create rollback points. This data never leaves your device.

### 3. Data Storage and Security

* **Local Storage Only**: All your saved snapshots, whitelists, and preferences remain strictly on your local machine.
* **User Control**: You can delete all saved data at any time by using the "Clear all snapshots" button within the Extension or by uninstalling the Extension.

### 4. Permissions Disclosure

Sitewipe requires specific permissions to function as a developer tool:

* `storage`: To save your settings and snapshots locally.
* `cookies` & `browsingData`: To manage and clear site-specific data.
* `scripting`: To inspect and modify storage values on the active page.
* `tabs`: To identify the active origin and scope actions correctly.

### 5. Third-Party Sites

Sitewipe operates on third-party websites you visit. We are not responsible for the privacy practices or content of those websites.

### 6. Changes to This Policy

We may update this Privacy Policy from time to time to reflect changes in our features or legal requirements. Any updates will be posted on this page.

### 7. Contact Us

If you have any questions regarding this Privacy Policy, please contact:

* **Developer**: thuydtshop
* **Email**: thuydtshop@gmail.com

---

**Note to Developer:** Để hoàn tất, bạn nên đưa nội dung này lên một trang web (như GitHub Pages) hoặc lưu thành file `PRIVACY.md` trong kho mã nguồn của bạn để lấy đường dẫn khai báo với Google.