import { defineManifest } from '@crxjs/vite-plugin'
import { manifestShared } from './manifest.shared'

export default defineManifest({
  ...manifestShared,
})
