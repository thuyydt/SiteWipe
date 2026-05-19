/**
 * Shared MV3 fields for Chrome / Firefox builds (CRXJS consumes this shape).
 */
export const manifestShared = {
  manifest_version: 3 as const,
  name: 'Sitewipe',
  description: 'Mini DevTools for clearing and inspecting site storage.',
  version: '2.0.1',
  icons: {
    16: 'icons/extension_icon16.png',
    32: 'icons/extension_icon32.png',
    48: 'icons/extension_icon48.png',
    128: 'icons/extension_icon128.png',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      16: 'icons/extension_icon16.png',
      32: 'icons/extension_icon32.png',
      48: 'icons/extension_icon48.png',
    },
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module' as const,
  },
  permissions: ['storage', 'tabs', 'scripting', 'cookies', 'browsingData', 'webNavigation', 'activeTab'],
  host_permissions: ['http://*/*', 'https://*/*'],
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*'],
      js: ['src/content/watchBridge.ts'],
      run_at: 'document_start' as const,
      world: 'ISOLATED' as const,
    },
    {
      matches: ['http://*/*', 'https://*/*'],
      js: ['src/content/mainPatch.ts'],
      run_at: 'document_start' as const,
      world: 'MAIN' as const,
    },
  ],
  web_accessible_resources: [
    {
      resources: ['src/doc/index.html'],
      matches: ['<all_urls>'],
    },
  ],
}
