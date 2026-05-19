import type {
  ExtensionRequest,
  InspectCookie,
  RestoreDiffEntry,
  EnvPayload,
  SnapshotCookie,
  SnapshotData,
} from '@/lib/schema'
import browser from '@/extension/browser'
import {
  installSitewipeStorageWatch,
  probeInspectMeta,
  probePageStorage,
  removeStorageItem,
  setStorageItem,
} from '@/injected/pageStorage'
import { formatCaughtExtensionError } from '@/lib/extensionErrors'
import { isRestrictedUrl } from '@/lib/permissions'
import { diffSnapshotData } from '@/lib/snapshotDiff'
import { purgeOrigin, killAndReload, getPurgeImpactSummary } from '@/background/handlers/purge'
import { captureSnapshot } from '@/background/handlers/snapshotCapture'
import { restoreSnapshot, applyEnvPayload } from '@/background/handlers/snapshotRestore'
import { autoCapture } from '@/background/autoSnapshot'
import {
  readProfiles,
  writeProfiles,
  readSnapshots,
  writeSnapshots,
  readAutoWatchOrigins,
  writeAutoWatchOrigins,
} from '@/background/handlers/storagePersistence'
import { removeInspectCookie, upsertInspectCookie } from '@/background/handlers/cookies'
import {
  idbInspectSummary,
  idbSampleStoreRows,
  listCacheStorageOverview,
  listServiceWorkerRegistrations,
  unregisterServiceWorkerAtScope,
} from '@/injected/inspectDeep'

const IDB_SAMPLE_ROW_LIMIT = 45

function unwrapProbePage(result: unknown): ReturnType<typeof probePageStorage> {
  return (
    (result as ReturnType<typeof probePageStorage> | undefined) ?? {
      localStorage: {},
      sessionStorage: {},
    }
  )
}

function unwrapProbeInspect(result: unknown): ReturnType<typeof probeInspectMeta> {
  return (
    (result as ReturnType<typeof probeInspectMeta> | undefined) ?? {
      localStorage: {},
      sessionStorage: {},
      sharedStorageAvailable: false,
    }
  )
}

function escapeCli(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

async function cookiesForInspect(url: string): Promise<InspectCookie[]> {
  const list = await browser.cookies.getAll({ url })
  return list.map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path,
    secure: c.secure,
    httpOnly: c.httpOnly,
    sameSite: c.sameSite,
    session: c.session,
    expirationDate: c.expirationDate,
    storeId: c.storeId,
    partitionKey: c.partitionKey
      ? {
          topLevelSite: c.partitionKey.topLevelSite,
        }
      : undefined,
  }))
}

function isEnvPayload(v: unknown): v is EnvPayload {
  if (v == null || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  if (o.localStorage != null && typeof o.localStorage !== 'object') return false
  if (o.sessionStorage != null && typeof o.sessionStorage !== 'object') return false
  if (o.cookies != null && !Array.isArray(o.cookies)) return false
  return true
}

async function readLiveSnapshotData(tabId: number, url: string): Promise<SnapshotData> {
  const [inj] = await browser.scripting.executeScript({
    target: { tabId },
    func: probePageStorage,
    world: 'MAIN',
  })
  const probe = unwrapProbePage(inj.result)
  const rawCookies = await browser.cookies.getAll({ url })
  const cookies: SnapshotCookie[] = rawCookies.map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path,
    secure: c.secure,
    httpOnly: c.httpOnly,
    sameSite: c.sameSite,
    expirationDate: c.expirationDate,
    session: c.session,
  }))
  return {
    localStorage: probe.localStorage,
    sessionStorage: probe.sessionStorage,
    cookies,
  }
}

export async function dispatchMessage(msg: ExtensionRequest): Promise<unknown> {
  switch (msg.type) {
    case 'GET_ACTIVE_TAB_CONTEXT': {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true })
      const tab = tabs[0]
      const url = tab?.url ?? null
      const restricted = isRestrictedUrl(url ?? undefined)
      return {
        ok: true,
        tabId: tab?.id ?? null,
        origin: url ? new URL(url).origin : null,
        url,
        title: tab?.title ?? null,
        restricted,
      }
    }

    case 'GET_SUMMARY': {
      try {
        const tab = await browser.tabs.get(msg.tabId)
        const url = tab.url
        if (!url || isRestrictedUrl(url)) {
          return { ok: false, error: 'Cannot read summary on this page.' }
        }
        const cookies = await browser.cookies.getAll({ url })
        const [inj] = await browser.scripting.executeScript({
          target: { tabId: msg.tabId },
          func: probeInspectMeta,
          world: 'MAIN',
        })
        const probe = unwrapProbeInspect(inj.result)
        return {
          ok: true,
          summary: {
            cookies: cookies.length,
            localStorageKeys: Object.keys(probe.localStorage).length,
            sessionStorageKeys: Object.keys(probe.sessionStorage).length,
          },
        }
      } catch (e) {
        const message = formatCaughtExtensionError(e)
        return { ok: false, error: message }
      }
    }

    case 'GET_STORAGE_TABLE': {
      try {
        const tab = await browser.tabs.get(msg.tabId)
        const url = tab.url
        if (!url || isRestrictedUrl(url)) {
          return { ok: false, error: 'Cannot inspect storage on this page.' }
        }
        const [inj] = await browser.scripting.executeScript({
          target: { tabId: msg.tabId },
          func: probeInspectMeta,
          world: 'MAIN',
        })
        const probe = unwrapProbeInspect(inj.result)
        const cookies = await cookiesForInspect(url)
        return {
          ok: true,
          localStorage: probe.localStorage,
          sessionStorage: probe.sessionStorage,
          sharedStorageAvailable: probe.sharedStorageAvailable,
          cookies,
        }
      } catch (e) {
        const message = formatCaughtExtensionError(e)
        return { ok: false, error: message }
      }
    }

    case 'SET_STORAGE_VALUE': {
      try {
        await browser.scripting.executeScript({
          target: { tabId: msg.tabId },
          func: setStorageItem,
          args: [msg.storage, msg.key, msg.value],
          world: 'MAIN',
        })
        return { ok: true }
      } catch (e) {
        const message = formatCaughtExtensionError(e)
        return { ok: false, error: message }
      }
    }

    case 'DELETE_STORAGE_KEY': {
      try {
        await browser.scripting.executeScript({
          target: { tabId: msg.tabId },
          func: removeStorageItem,
          args: [msg.storage, msg.key],
          world: 'MAIN',
        })
        return { ok: true }
      } catch (e) {
        const message = formatCaughtExtensionError(e)
        return { ok: false, error: message }
      }
    }

    case 'PURGE_ORIGIN': {
      try {
        await purgeOrigin({
          tabId: msg.tabId,
          origin: msg.origin,
          url: msg.url,
          options: msg.options,
        })
        return { ok: true }
      } catch (e) {
        const message = formatCaughtExtensionError(e)
        return { ok: false, error: message }
      }
    }

    case 'LOAD_PROFILES':
      return { ok: true, profiles: await readProfiles() }

    case 'SAVE_PROFILES':
      await writeProfiles(msg.profiles)
      return { ok: true }

    case 'LOAD_SNAPSHOTS':
      return { ok: true, snapshots: await readSnapshots() }

    case 'SAVE_SNAPSHOTS':
      await writeSnapshots(msg.snapshots)
      return { ok: true }

    case 'CAPTURE_SNAPSHOT': {
      try {
        const tab = await browser.tabs.get(msg.tabId)
        const snapshot = await captureSnapshot({
          tabId: msg.tabId,
          origin: msg.origin,
          url: msg.url,
          name: msg.name,
          title: tab.title,
        })
        return { ok: true, snapshot }
      } catch (e) {
        const message = formatCaughtExtensionError(e)
        return { ok: false, error: message }
      }
    }

    case 'RESTORE_SNAPSHOT': {
      try {
        await restoreSnapshot({
          tabId: msg.tabId,
          snapshot: msg.snapshot,
          skipReload: msg.skipReload,
        })
        return { ok: true }
      } catch (e) {
        const message = formatCaughtExtensionError(e)
        return { ok: false, error: message }
      }
    }

    case 'GET_RESTORE_DIFF': {
      try {
        const [inj] = await browser.scripting.executeScript({
          target: { tabId: msg.tabId },
          func: probePageStorage,
          world: 'MAIN',
        })
        const cur = unwrapProbePage(inj.result)
        const snap = msg.snapshot.data
        const diff: RestoreDiffEntry[] = []

        const pushDiff = (
          storage: 'localStorage' | 'sessionStorage',
          beforeRec: Record<string, string>,
          afterRec: Record<string, string>,
        ) => {
          const keys = new Set([
            ...Object.keys(beforeRec),
            ...Object.keys(afterRec),
          ])
          for (const key of keys) {
            const before = beforeRec[key]
            const after = afterRec[key]
            if (before !== after) {
              diff.push({
                key,
                storage,
                before,
                after,
              })
            }
          }
        }

        pushDiff('localStorage', cur.localStorage, snap.localStorage)
        pushDiff('sessionStorage', cur.sessionStorage, snap.sessionStorage)

        return { ok: true, diff }
      } catch (e) {
        const message = formatCaughtExtensionError(e)
        return { ok: false, error: message }
      }
    }

    case 'COPY_MOCK_PAYLOAD': {
      try {
        const cookies = await browser.cookies.getAll({ url: msg.url })
        const [inj] = await browser.scripting.executeScript({
          target: { tabId: msg.tabId },
          func: probePageStorage,
          world: 'MAIN',
        })
        const probe = unwrapProbePage(inj.result)
        const payload = {
          origin: msg.origin,
          capturedAt: new Date().toISOString(),
          localStorage: probe.localStorage,
          sessionStorage: probe.sessionStorage,
          cookies: cookies.map((c) => ({
            name: c.name,
            value: c.value,
            domain: c.domain,
            path: c.path,
            secure: c.secure,
            httpOnly: c.httpOnly,
            sameSite: c.sameSite,
          })),
        }
        return { ok: true, json: JSON.stringify(payload, null, 2) }
      } catch (e) {
        const message = formatCaughtExtensionError(e)
        return { ok: false, error: message }
      }
    }

    case 'COPY_CLI_SCRIPT': {
      try {
        const cookies = await browser.cookies.getAll({ url: msg.url })
        const [inj] = await browser.scripting.executeScript({
          target: { tabId: msg.tabId },
          func: probePageStorage,
          world: 'MAIN',
        })
        const probe = unwrapProbePage(inj.result)
        const lines: string[] = ['// Paste into DevTools console', '']
        for (const [k, v] of Object.entries(probe.localStorage)) {
          lines.push(`localStorage.setItem('${escapeCli(k)}', '${escapeCli(v)}');`)
        }
        for (const [k, v] of Object.entries(probe.sessionStorage)) {
          lines.push(`sessionStorage.setItem('${escapeCli(k)}', '${escapeCli(v)}');`)
        }
        for (const c of cookies) {
          const part = `${c.name}=${c.value}; Path=${c.path}; Domain=${c.domain}${c.secure ? '; Secure' : ''}`
          lines.push(`document.cookie = '${escapeCli(part)}';`)
        }
        return { ok: true, script: lines.join('\n') }
      } catch (e) {
        const message = formatCaughtExtensionError(e)
        return { ok: false, error: message }
      }
    }

    case 'KILL_AND_RELOAD': {
      try {
        await killAndReload(msg.tabId, msg.origin)
        return { ok: true }
      } catch (e) {
        const message = formatCaughtExtensionError(e)
        return { ok: false, error: message }
      }
    }

    case 'COOKIE_UPSERT': {
      try {
        if (isRestrictedUrl(msg.pageUrl)) {
          return { ok: false, error: 'Cannot set cookies on this page.' }
        }
        await upsertInspectCookie(msg.pageUrl, msg.cookie)
        return { ok: true }
      } catch (e) {
        const message = formatCaughtExtensionError(e)
        return { ok: false, error: message }
      }
    }

    case 'COOKIE_REMOVE': {
      try {
        if (isRestrictedUrl(msg.pageUrl)) {
          return { ok: false, error: 'Cannot remove cookies on this page.' }
        }
        await removeInspectCookie(msg.pageUrl, msg.remove)
        return { ok: true }
      } catch (e) {
        const message = formatCaughtExtensionError(e)
        return { ok: false, error: message }
      }
    }

    case 'GET_INSPECT_SERVICE_WORKERS': {
      try {
        const tab = await browser.tabs.get(msg.tabId)
        const url = tab.url
        if (!url || isRestrictedUrl(url)) {
          return { ok: false, error: 'Unavailable on this page.' }
        }
        const [inj] = await browser.scripting.executeScript({
          target: { tabId: msg.tabId },
          func: listServiceWorkerRegistrations,
          world: 'MAIN',
        })
        const regs = inj.result ?? []
        return { ok: true, registrations: regs }
      } catch (e) {
        const message = formatCaughtExtensionError(e)
        return { ok: false, error: message }
      }
    }

    case 'UNREGISTER_SERVICE_WORKER_SCOPE': {
      try {
        const tab = await browser.tabs.get(msg.tabId)
        const url = tab.url
        if (!url || isRestrictedUrl(url)) {
          return { ok: false, error: 'Unavailable on this page.' }
        }
        const [inj] = await browser.scripting.executeScript({
          target: { tabId: msg.tabId },
          func: unregisterServiceWorkerAtScope,
          args: [msg.scope],
          world: 'MAIN',
        })
        const ok = inj.result === true
        if (!ok) return { ok: false, error: 'Registration not found' }
        return { ok: true }
      } catch (e) {
        const message = formatCaughtExtensionError(e)
        return { ok: false, error: message }
      }
    }

    case 'GET_INSPECT_CACHE_STORAGE': {
      try {
        const tab = await browser.tabs.get(msg.tabId)
        const url = tab.url
        if (!url || isRestrictedUrl(url)) {
          return { ok: false, error: 'Unavailable on this page.' }
        }
        const [inj] = await browser.scripting.executeScript({
          target: { tabId: msg.tabId },
          func: listCacheStorageOverview,
          world: 'MAIN',
        })
        const caches = inj.result ?? []
        return { ok: true, caches }
      } catch (e) {
        const message = formatCaughtExtensionError(e)
        return { ok: false, error: message }
      }
    }

    case 'GET_INSPECT_INDEXEDDB_SUMMARY': {
      try {
        const tab = await browser.tabs.get(msg.tabId)
        const url = tab.url
        if (!url || isRestrictedUrl(url)) {
          return { ok: false, error: 'Unavailable on this page.' }
        }
        const [inj] = await browser.scripting.executeScript({
          target: { tabId: msg.tabId },
          func: idbInspectSummary,
          world: 'MAIN',
        })
        const summary = inj.result ?? { databases: [], errors: [] }
        return { ok: true, summary }
      } catch (e) {
        const message = formatCaughtExtensionError(e)
        return { ok: false, error: message }
      }
    }

    case 'GET_INSPECT_INDEXEDDB_STORE_SAMPLE': {
      try {
        const tab = await browser.tabs.get(msg.tabId)
        const url = tab.url
        if (!url || isRestrictedUrl(url)) {
          return { ok: false, error: 'Unavailable on this page.' }
        }
        const [inj] = await browser.scripting.executeScript({
          target: { tabId: msg.tabId },
          func: idbSampleStoreRows,
          args: [msg.dbName, msg.storeName, IDB_SAMPLE_ROW_LIMIT],
          world: 'MAIN',
        })
        const rows = inj.result ?? []
        return { ok: true, rows }
      } catch (e) {
        const message = formatCaughtExtensionError(e)
        return { ok: false, error: message }
      }
    }

    case 'GET_PURGE_IMPACT': {
      try {
        const tab = await browser.tabs.get(msg.tabId)
        const url = tab.url
        if (!url || isRestrictedUrl(url)) {
          return { ok: false, error: 'Cannot analyze purge on this page.' }
        }
        const impact = await getPurgeImpactSummary({
          tabId: msg.tabId,
          origin: msg.origin,
          url: msg.url,
          options: msg.options,
        })
        return { ok: true, impact }
      } catch (e) {
        const message = formatCaughtExtensionError(e)
        return { ok: false, error: message }
      }
    }

    case 'COMPARE_SNAPSHOT_DATA': {
      try {
        const diff = diffSnapshotData(msg.left.data, msg.right.data)
        return { ok: true, diff }
      } catch (e) {
        const message = formatCaughtExtensionError(e)
        return { ok: false, error: message }
      }
    }

    case 'GET_SNAPSHOT_VS_LIVE_DIFF': {
      try {
        const tab = await browser.tabs.get(msg.tabId)
        const url = tab.url
        if (!url || isRestrictedUrl(url)) {
          return { ok: false, error: 'Cannot read live tab for diff.' }
        }
        const live = await readLiveSnapshotData(msg.tabId, url)
        const diff = diffSnapshotData(msg.snapshot.data, live)
        return { ok: true, diff }
      } catch (e) {
        const message = formatCaughtExtensionError(e)
        return { ok: false, error: message }
      }
    }

    case 'APPLY_ENV_PAYLOAD': {
      try {
        const tab = await browser.tabs.get(msg.tabId)
        const url = tab.url
        if (!url || isRestrictedUrl(url)) {
          return { ok: false, error: 'Cannot apply payload on this page.' }
        }
        if (!isEnvPayload(msg.payload)) {
          return { ok: false, error: 'Invalid env JSON shape.' }
        }
        await applyEnvPayload({
          tabId: msg.tabId,
          pageUrl: msg.url,
          payload: msg.payload,
        })
        return { ok: true }
      } catch (e) {
        const message = formatCaughtExtensionError(e)
        return { ok: false, error: message }
      }
    }

    case 'GET_AUTO_WATCH_ORIGINS':
      return { ok: true, origins: await readAutoWatchOrigins() }

    case 'SET_AUTO_WATCH_ORIGINS': {
      const previous = await readAutoWatchOrigins()
      const before = new Set(previous)
      const after = new Set(msg.origins)
      const added: string[] = []
      for (const o of after) if (!before.has(o)) added.push(o)
      await writeAutoWatchOrigins(msg.origins)

      for (const origin of added) {
        try {
          const tabs = await browser.tabs.query({})
          for (const t of tabs) {
            if (t.id == null || !t.url || isRestrictedUrl(t.url)) continue
            if (new URL(t.url).origin !== origin) continue
            try {
              await browser.scripting.executeScript({
                target: { tabId: t.id },
                func: installSitewipeStorageWatch,
                world: 'MAIN',
              })
            } catch {
              /* restricted frame */
            }
          }
        } catch {
          /* tabs query unavailable */
        }
        void autoCapture({ origin, source: 'baseline' })
      }

      return { ok: true }
    }

    default:
      return { ok: false, error: 'Unknown message type' }
  }
}
