import type { PurgeOptions } from '@/lib/schema'
import type Browser from 'webextension-polyfill'
import browser from '@/extension/browser'
import { browsingDataRemoveLogged, type DataTypeSetChromium } from '@/extension/capabilities'
import { cookieSetUrl } from '@/lib/cookieUrl'
import {
  clearPageSessionStorage,
  mergeLocalStoragePartial,
  probeInspectMeta,
  unregisterServiceWorkers,
} from '@/injected/pageStorage'

function normalizedNameSet(options: PurgeOptions): Set<string> {
  return new Set(
    (options.whitelistCookieNames ?? []).map((s) => s.trim()).filter(Boolean),
  )
}

function normalizedLsKeys(options: PurgeOptions): Set<string> {
  return new Set(
    (options.whitelistLocalStorageKeys ?? []).map((s) => s.trim()).filter(Boolean),
  )
}

async function selectiveCookieSweep(
  pageUrl: string,
  options: PurgeOptions,
  wlCookies: Set<string>,
): Promise<void> {
  const list = await browser.cookies.getAll({ url: pageUrl })
  for (const c of list) {
    if (wlCookies.has(c.name)) continue
    if (c.session && options.preserveSessionCookies) continue
    try {
      const url = cookieSetUrl(pageUrl, c)
      const details: Browser.Cookies.RemoveDetailsType = { url, name: c.name }
      if (c.storeId != null) details.storeId = c.storeId
      if (c.partitionKey != null)
        details.partitionKey = c.partitionKey as Browser.Cookies.PartitionKey
      await browser.cookies.remove(details)
    } catch {
      /* skip */
    }
  }
}

export async function purgeOrigin(params: {
  tabId: number
  origin: string
  url: string
  options: PurgeOptions
}): Promise<void> {
  const { tabId, origin, url, options } = params

  const wlCookies = normalizedNameSet(options)
  const wlLs = normalizedLsKeys(options)

  let preservedLs: Record<string, string> = {}
  if (options.localStorage && wlLs.size > 0) {
    const [inj] = await browser.scripting.executeScript({
      target: { tabId },
      func: probeInspectMeta,
      world: 'MAIN',
    })
    const meta = inj.result as ReturnType<typeof probeInspectMeta> | undefined
    const ls = meta?.localStorage ?? {}
    for (const key of wlLs) {
      if (Object.prototype.hasOwnProperty.call(ls, key)) {
        preservedLs[key] = ls[key] as string
      }
    }
  }

  if (options.sessionStorage) {
    await browser.scripting.executeScript({
      target: { tabId },
      func: clearPageSessionStorage,
      world: 'MAIN',
    })
  }

  const removal: DataTypeSetChromium = {}

  if (options.localStorage) removal.localStorage = true
  if (options.indexedDB) removal.indexedDB = true
  if (options.cacheStorage) removal.cacheStorage = true
  if (options.serviceWorkers) removal.serviceWorkers = true

  const useBulkCookieRemoval =
    Boolean(options.cookies) && !options.preserveSessionCookies && wlCookies.size === 0

  if (useBulkCookieRemoval) {
    removal.cookies = true
  }

  if (Object.keys(removal).length > 0) {
    await browsingDataRemoveLogged({ origins: [origin] }, removal)
  }

  if (options.localStorage && Object.keys(preservedLs).length > 0) {
    await browser.scripting.executeScript({
      target: { tabId },
      func: mergeLocalStoragePartial,
      args: [preservedLs],
      world: 'MAIN',
    })
  }

  if (options.cookies) {
    if (useBulkCookieRemoval) {
      /* all cookies cleared by browsingData */
    } else {
      await selectiveCookieSweep(url, options, wlCookies)
    }
  }

  if (options.serviceWorkers) {
    try {
      await browser.scripting.executeScript({
        target: { tabId },
        func: unregisterServiceWorkers,
        world: 'MAIN',
      })
    } catch {
      /* ignore — page may block SW API */
    }
  }
}

/** Read-only summary for dry-run UI */
export async function getPurgeImpactSummary(params: {
  tabId: number
  origin: string
  url: string
  options: PurgeOptions
}): Promise<{
  origin: string
  cookieCount: number
  localStorageKeys: number
  sessionStorageKeys: number
  dataTypes: string[]
  mayAffectLogin: boolean
  whitelistCookies: number
  whitelistLocalStorage: number
}> {
  const { tabId, origin, url, options } = params
  const wlC = normalizedNameSet(options)
  const wlL = normalizedLsKeys(options)

  const cookies = await browser.cookies.getAll({ url })
  const [inj] = await browser.scripting.executeScript({
    target: { tabId },
    func: probeInspectMeta,
    world: 'MAIN',
  })
  const meta = inj.result as ReturnType<typeof probeInspectMeta> | undefined
  const probe = meta ?? { localStorage: {}, sessionStorage: {}, sharedStorageAvailable: false }

  const dataTypes: string[] = []
  if (options.cookies) dataTypes.push('Cookies')
  if (options.localStorage) dataTypes.push('localStorage')
  if (options.sessionStorage) dataTypes.push('sessionStorage')
  if (options.indexedDB) dataTypes.push('IndexedDB')
  if (options.cacheStorage) dataTypes.push('Cache storage')
  if (options.serviceWorkers) dataTypes.push('Service workers')

  const useBulkCookieRemoval =
    Boolean(options.cookies) && !options.preserveSessionCookies && wlC.size === 0

  let cookiesAffected = 0
  if (options.cookies) {
    if (useBulkCookieRemoval) {
      cookiesAffected = cookies.length
    } else {
      for (const c of cookies) {
        if (wlC.has(c.name)) continue
        if (c.session && options.preserveSessionCookies) continue
        cookiesAffected++
      }
    }
  }

  let lsKeysAffected = 0
  if (options.localStorage) {
    const keys = Object.keys(probe.localStorage)
    for (const k of keys) {
      if (!wlL.has(k)) lsKeysAffected++
    }
  }

  const mayAffectLogin =
    (options.cookies && cookiesAffected > 0 && useBulkCookieRemoval) ||
    (options.cookies &&
      cookiesAffected > 0 &&
      !useBulkCookieRemoval &&
      !options.preserveSessionCookies &&
      wlC.size === 0) ||
    (options.localStorage && lsKeysAffected > 0 && wlL.size === 0)

  let whitelistCookies = 0
  let whitelistLocalStorage = 0
  if (wlC.size > 0) {
    whitelistCookies = cookies.filter((c) => wlC.has(c.name)).length
  }
  if (wlL.size > 0) {
    for (const k of wlL) {
      if (Object.prototype.hasOwnProperty.call(probe.localStorage, k)) whitelistLocalStorage++
    }
  }

  return {
    origin,
    cookieCount: cookiesAffected,
    localStorageKeys: lsKeysAffected,
    sessionStorageKeys: options.sessionStorage ? Object.keys(probe.sessionStorage).length : 0,
    dataTypes,
    mayAffectLogin,
    whitelistCookies,
    whitelistLocalStorage,
  }
}

/** Aggressive wipe + unregister SW fallback */
export async function killAndReload(tabId: number, origin: string): Promise<void> {
  await browser.scripting.executeScript({
    target: { tabId },
    func: clearPageSessionStorage,
    world: 'MAIN',
  })

  await browsingDataRemoveLogged(
    { origins: [origin] },
    {
      cookies: true,
      localStorage: true,
      indexedDB: true,
      cacheStorage: true,
      serviceWorkers: true,
    },
  )

  try {
    await browser.scripting.executeScript({
      target: { tabId },
      func: unregisterServiceWorkers,
      world: 'MAIN',
    })
  } catch {
    /* ignore */
  }

  await browser.tabs.reload(tabId)
}
