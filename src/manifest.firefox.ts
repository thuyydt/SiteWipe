import { defineManifest } from '@crxjs/vite-plugin'
import { manifestShared } from './manifest.shared'

/** Firefox — background.scripts paired with service_worker for AMO / web-ext lint (MV3). */
export default defineManifest({
  ...manifestShared,
  background: {
    service_worker: manifestShared.background.service_worker,
    type: 'module',
    scripts: [manifestShared.background.service_worker],
  },
  browser_specific_settings: {
    gecko: {
      id: 'sitewipe@sitewipe.github.io',
      strict_min_version: '142.0',
      data_collection_permissions: {
        required: ['none'],
      },
    },
  },
})
