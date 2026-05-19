/**
 * Page-context probes for Inspect deep sections (each export must stay self-contained for executeScript).
 */

const MAX_CACHES = 50
const MAX_URLS_PER_CACHE = 200

export async function listServiceWorkerRegistrations(): Promise<
  Array<{ scope: string; scriptURL: string; state: string }>
> {
  if (!('serviceWorker' in navigator)) return []
  const regs = await navigator.serviceWorker.getRegistrations()
  return regs.map((r) => ({
    scope: r.scope,
    scriptURL:
      r.active?.scriptURL ??
      r.installing?.scriptURL ??
      r.waiting?.scriptURL ??
      '',
    state:
      r.active?.state ??
      r.installing?.state ??
      r.waiting?.state ??
      'none',
  }))
}

export async function unregisterServiceWorkerAtScope(scopeUrl: string): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false
  const regs = await navigator.serviceWorker.getRegistrations()
  const match = regs.find((r) => r.scope === scopeUrl)
  if (!match) return false
  return match.unregister()
}

export async function listCacheStorageOverview(): Promise<
  Array<{ cacheName: string; urls: string[]; truncated: boolean }>
> {
  if (!('caches' in window)) return []
  const names = (await caches.keys()).slice(0, MAX_CACHES)
  const out: Array<{ cacheName: string; urls: string[]; truncated: boolean }> = []
  for (const cacheName of names) {
    try {
      const c = await caches.open(cacheName)
      const reqs = await c.keys()
      const urls = reqs.slice(0, MAX_URLS_PER_CACHE).map((req) => req.url)
      out.push({
        cacheName,
        urls,
        truncated: reqs.length > MAX_URLS_PER_CACHE,
      })
    } catch {
      out.push({ cacheName, urls: [], truncated: false })
    }
  }
  return out
}

const MAX_DATABASES = 15

export async function idbInspectSummary(): Promise<{
  databases: Array<{ name: string; version: number; stores: string[] }>
  errors: string[]
}> {
  const errors: string[] = []
  const databases: Array<{ name: string; version: number; stores: string[] }> = []
  if (!('indexedDB' in window) || typeof indexedDB.databases !== 'function') {
    errors.push('indexedDB.databases() not available')
    return { databases, errors }
  }
  let infos: Array<{ name?: string | null; version?: number }>
  try {
    infos = await indexedDB.databases()
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e))
    return { databases, errors }
  }
  for (const info of infos.slice(0, MAX_DATABASES)) {
    if (info.name == null || info.name === '') continue
    const dbName = info.name
    try {
      const detail = await new Promise<{ name: string; version: number; stores: string[] }>(
        (resolve, reject) => {
          const req = indexedDB.open(dbName)
          req.onerror = () => reject(req.error ?? new Error('IDB open failed'))
          req.onsuccess = () => {
            const db = req.result
            const stores = Array.from(db.objectStoreNames)
            const name = db.name
            const version = db.version
            db.close()
            resolve({ name, version, stores })
          }
        },
      )
      databases.push(detail)
    } catch (e) {
      errors.push(`${dbName}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return { databases, errors }
}

function serializeIdbValue(val: unknown, depth = 0): unknown {
  if (depth > 8) return '[max depth]'
  if (val == null || typeof val === 'number' || typeof val === 'boolean')
    return val as number | boolean | null
  if (typeof val === 'string') {
    const max = 8000
    return val.length > max ? `${val.slice(0, max)}… (${val.length} chars)` : val
  }
  if (val instanceof Blob)
    return { __type: 'Blob', size: val.size, mime: val.type || 'unknown' }
  if (val instanceof ArrayBuffer)
    return { __type: 'ArrayBuffer', byteLength: val.byteLength }
  if (ArrayBuffer.isView(val))
    return {
      __type: 'TypedArray',
      name: val.constructor.name,
      byteLength: val.byteLength,
    }
  if (Array.isArray(val))
    return val.slice(0, 50).map((x) => serializeIdbValue(x, depth + 1))
  if (typeof val === 'object') {
    try {
      const o = val as Record<string, unknown>
      const keys = Object.keys(o).slice(0, 40)
      const next: Record<string, unknown> = {}
      for (const k of keys) next[k] = serializeIdbValue(o[k], depth + 1)
      return next
    } catch {
      return '[object]'
    }
  }
  return String(val)
}

export async function idbSampleStoreRows(
  dbName: string,
  storeName: string,
  limit: number,
): Promise<Array<{ key: unknown; value: unknown }>> {
  const rows: Array<{ key: unknown; value: unknown }> = []
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.open(dbName)
    req.onerror = () => reject(req.error ?? new Error('IDB open failed'))
    req.onsuccess = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(storeName)) {
        db.close()
        resolve()
        return
      }
      const tx = db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const cur = store.openCursor()
      cur.onerror = () => reject(cur.error ?? new Error('cursor error'))
      cur.onsuccess = () => {
        const cursor = cur.result
        if (!cursor || rows.length >= limit) {
          db.close()
          resolve()
          return
        }
        try {
          rows.push({
            key: serializeIdbValue(cursor.key),
            value: serializeIdbValue(cursor.value),
          })
        } catch {
          rows.push({ key: '[key]', value: '[unreadable]' })
        }
        cursor.continue()
      }
    }
  })
  return rows
}
