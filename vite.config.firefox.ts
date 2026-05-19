import path from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { crx } from '@crxjs/vite-plugin'
import manifest from './src/manifest.firefox'

export default defineConfig({
  plugins: [vue(), crx({ manifest, browser: 'firefox' })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist-firefox',
    rollupOptions: {
      input: {
        doc: path.resolve(__dirname, 'src/doc/index.html'),
      },
    },
  },
})
