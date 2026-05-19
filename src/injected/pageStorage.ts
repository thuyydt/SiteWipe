/**
 * Functions injected with browser.scripting.executeScript (world MAIN).
 * Keep self-contained — only referenced from the service worker bundle.
 */

export function probePageStorage(): {
  localStorage: Record<string, string>
  sessionStorage: Record<string, string>
} {
  const ls: Record<string, string> = {}
  const ss: Record<string, string> = {}
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i)
    if (k != null) ls[k] = window.localStorage.getItem(k) ?? ''
  }
  for (let i = 0; i < window.sessionStorage.length; i++) {
    const k = window.sessionStorage.key(i)
    if (k != null) ss[k] = window.sessionStorage.getItem(k) ?? ''
  }
  return { localStorage: ls, sessionStorage: ss }
}

/** Storage snapshot + Privacy Sandbox Shared Storage API presence (not enumerable here). */
export function probeInspectMeta(): {
  localStorage: Record<string, string>
  sessionStorage: Record<string, string>
  sharedStorageAvailable: boolean
} {
  const ls: Record<string, string> = {}
  const ss: Record<string, string> = {}
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i)
    if (k != null) ls[k] = window.localStorage.getItem(k) ?? ''
  }
  for (let i = 0; i < window.sessionStorage.length; i++) {
    const k = window.sessionStorage.key(i)
    if (k != null) ss[k] = window.sessionStorage.getItem(k) ?? ''
  }
  const sharedStorageAvailable =
    typeof navigator !== 'undefined' &&
    'sharedStorage' in navigator &&
    (navigator as Navigator & { sharedStorage?: unknown }).sharedStorage != null
  return {
    localStorage: ls,
    sessionStorage: ss,
    sharedStorageAvailable,
  }
}

export function clearPageSessionStorage(): void {
  window.sessionStorage.clear()
}

export function applyPageStoragePayload(payload: {
  localStorage: Record<string, string>
  sessionStorage: Record<string, string>
}): void {
  window.localStorage.clear()
  window.sessionStorage.clear()
  for (const [k, v] of Object.entries(payload.localStorage)) {
    window.localStorage.setItem(k, v)
  }
  for (const [k, v] of Object.entries(payload.sessionStorage)) {
    window.sessionStorage.setItem(k, v)
  }
}

export function setStorageItem(
  storage: 'localStorage' | 'sessionStorage',
  key: string,
  value: string,
): void {
  window[storage].setItem(key, value)
}

export function removeStorageItem(
  storage: 'localStorage' | 'sessionStorage',
  key: string,
): void {
  window[storage].removeItem(key)
}

export function unregisterServiceWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) return Promise.resolve()
  return navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const r of regs) {
      void r.unregister()
    }
  })
}

/** After a browsingData localStorage wipe, restore only selected keys (no clear). */
export function mergeLocalStoragePartial(entries: Record<string, string>): void {
  for (const [k, v] of Object.entries(entries)) {
    try {
      window.localStorage.setItem(k, v)
    } catch {
      /* quota / blocked */
    }
  }
}

const STORAGE_EVT = 'sitewipe-storage-change'

/**
 * Patches `Storage.prototype.{setItem,removeItem,clear}` so both
 * `localStorage.setItem(...)` and `Storage.prototype.setItem.call(localStorage, ...)`
 * styles are intercepted. Dispatches a DOM CustomEvent on the document so an
 * ISOLATED-world content script can bridge it to the service worker.
 *
 * Idempotent per realm via a `__sitewipeWatchInstalled` flag on `window`.
 */
export function installSitewipeStorageWatch(): void {
  const w = window as Window & { __sitewipeWatchInstalled?: boolean }
  if (w.__sitewipeWatchInstalled) return
  w.__sitewipeWatchInstalled = true

  const emit = (area: 'localStorage' | 'sessionStorage', key?: string) => {
    try {
      document.dispatchEvent(
        new CustomEvent(STORAGE_EVT, { detail: { area, key } }),
      )
    } catch {
      /* detached document */
    }
  }

  try {
    const proto = Storage.prototype
    const originalSet = proto.setItem
    const originalRemove = proto.removeItem
    const originalClear = proto.clear

    proto.setItem = function (this: Storage, key: string, value: string) {
      originalSet.call(this, key, value)
      emit(this === window.sessionStorage ? 'sessionStorage' : 'localStorage', key)
    }
    proto.removeItem = function (this: Storage, key: string) {
      originalRemove.call(this, key)
      emit(this === window.sessionStorage ? 'sessionStorage' : 'localStorage', key)
    }
    proto.clear = function (this: Storage) {
      originalClear.call(this)
      emit(this === window.sessionStorage ? 'sessionStorage' : 'localStorage')
    }
  } catch {
    /* Storage prototype unavailable / frozen */
  }
}
