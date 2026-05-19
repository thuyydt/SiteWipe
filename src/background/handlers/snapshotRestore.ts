import browser from '@/extension/browser'
import { browsingDataRemoveLogged } from '@/extension/capabilities'
import type { EnvPayload, SnapshotCookie, SnapshotRecord } from '@/lib/schema'
import { cookieSetUrl } from '@/lib/cookieUrl'
import {
  applyPageStoragePayload,
  clearPageSessionStorage,
} from '@/injected/pageStorage'

export async function restoreSnapshot(params: {
  tabId: number
  snapshot: SnapshotRecord
  /** When true (e.g. diff preview path), skip reload */
  skipReload?: boolean
}): Promise<void> {
  const { tabId, snapshot, skipReload } = params
  const origin = snapshot.origin

  await browser.scripting.executeScript({
    target: { tabId },
    func: clearPageSessionStorage,
    world: 'MAIN',
  })

  await browsingDataRemoveLogged(
    { origins: [origin] },
    { cookies: true, localStorage: true },
  )

  await browser.scripting.executeScript({
    target: { tabId },
    func: applyPageStoragePayload,
    args: [
      {
        localStorage: snapshot.data.localStorage,
        sessionStorage: snapshot.data.sessionStorage,
      },
    ],
    world: 'MAIN',
  })

  const tab = await browser.tabs.get(tabId)
  const pageUrl = tab.url ?? origin

  for (const c of snapshot.data.cookies) {
    try {
      const url = cookieSetUrl(pageUrl, c)
      await browser.cookies.set({
        url,
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path || '/',
        secure: c.secure,
        httpOnly: c.httpOnly,
        sameSite: c.sameSite,
        expirationDate: c.session ? undefined : c.expirationDate,
      })
    } catch {
      /* skip malformed cookie restore */
    }
  }

  if (!skipReload) {
    await browser.tabs.reload(tabId)
  }
}

function uuid(): string {
  return crypto.randomUUID()
}

/** Apply portable mock / env JSON (cookies + storages) like a snapshot restore. */
export async function applyEnvPayload(params: {
  tabId: number
  pageUrl: string
  payload: EnvPayload
}): Promise<void> {
  const { tabId, pageUrl, payload } = params
  const tab = await browser.tabs.get(tabId)
  const origin =
    payload.origin != null && payload.origin.length > 0
      ? new URL(payload.origin).origin
      : tab.url
        ? new URL(tab.url).origin
        : null
  if (!origin) throw new Error('Could not resolve origin')

  await browser.scripting.executeScript({
    target: { tabId },
    func: clearPageSessionStorage,
    world: 'MAIN',
  })

  await browsingDataRemoveLogged({ origins: [origin] }, { cookies: true, localStorage: true })

  const ls = payload.localStorage ?? {}
  const ss = payload.sessionStorage ?? {}
  await browser.scripting.executeScript({
    target: { tabId },
    func: applyPageStoragePayload,
    args: [{ localStorage: ls, sessionStorage: ss }],
    world: 'MAIN',
  })

  const rawCookies = payload.cookies ?? []
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

  const page = await browser.tabs.get(tabId)
  const resolvedPageUrl = page.url ?? pageUrl

  for (const c of cookies) {
    try {
      const u = cookieSetUrl(resolvedPageUrl, c)
      await browser.cookies.set({
        url: u,
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path || '/',
        secure: c.secure,
        httpOnly: c.httpOnly,
        sameSite: c.sameSite,
        expirationDate: c.session ? undefined : c.expirationDate,
      })
    } catch {
      /* skip malformed */
    }
  }

  await browser.tabs.reload(tabId)
}

/** Build a SnapshotRecord from payload for diff/compare tooling. */
export function snapshotFromEnvPayload(payload: EnvPayload, originFallback: string): SnapshotRecord {
  const origin =
    payload.origin != null && payload.origin.length > 0
      ? new URL(payload.origin).origin
      : originFallback
  const cookies: SnapshotCookie[] = (payload.cookies ?? []).map((c) => ({
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path,
    secure: Boolean(c.secure),
    httpOnly: Boolean(c.httpOnly),
    sameSite: c.sameSite,
    expirationDate: c.expirationDate,
    session: c.session,
  }))
  return {
    id: uuid(),
    origin,
    name: `Imported · ${new Date().toLocaleString()}`,
    timestamp: Math.floor(Date.now() / 1000),
    data: {
      cookies,
      localStorage: payload.localStorage ?? {},
      sessionStorage: payload.sessionStorage ?? {},
    },
  }
}
