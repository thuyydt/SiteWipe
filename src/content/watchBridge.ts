/**
 * ISOLATED-world content script that bridges MAIN-world storage events
 * (dispatched by `installSitewipeStorageWatch`) to the service worker.
 *
 * Only forwards when `location.origin` is enabled in `autoWatchOrigins`
 * (browser.storage.local), so unrelated tabs stay cheap.
 */
import browser from '@/extension/browser'
const EVT = 'sitewipe-storage-change'
const AUTO_WATCH_KEY = 'autoWatchOrigins'

let watched = new Set<string>()
let debounceTimer: number | undefined

async function refreshWatched() {
  try {
    const r = await browser.storage.local.get(AUTO_WATCH_KEY)
    const list = r[AUTO_WATCH_KEY]
    watched = new Set(Array.isArray(list) ? list : [])
  } catch {
    /* extension context gone */
  }
}

void refreshWatched()

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return
  if (!Object.prototype.hasOwnProperty.call(changes, AUTO_WATCH_KEY)) return
  const next = changes[AUTO_WATCH_KEY]?.newValue
  watched = new Set(Array.isArray(next) ? next : [])
})

document.addEventListener(EVT, () => {
  if (!watched.has(location.origin)) return
  if (debounceTimer !== undefined) window.clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => {
    debounceTimer = undefined
    try {
      void browser.runtime.sendMessage({ type: 'AUTO_SNAPSHOT_TICK' })
    } catch {
      /* service worker not available */
    }
  }, 700)
})
