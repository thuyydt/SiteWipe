import browser from '@/extension/browser'
import type { SnapshotCookie, SnapshotRecord } from '@/lib/schema'
import { probePageStorage } from '@/injected/pageStorage'

function uuid(): string {
  return crypto.randomUUID()
}

export async function captureSnapshot(params: {
  tabId: number
  origin: string
  url: string
  name?: string
  title?: string
}): Promise<SnapshotRecord> {
  const { tabId, origin, url, name, title } = params

  const [inj] = await browser.scripting.executeScript({
    target: { tabId },
    func: probePageStorage,
    world: 'MAIN',
  })

  const raw = inj.result as ReturnType<typeof probePageStorage> | undefined
  const probe = raw ?? { localStorage: {}, sessionStorage: {} }

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

  const now = Date.now()
  const auto =
    name?.trim() ||
    `Snapshot — ${title?.slice(0, 40) || new URL(url).pathname || '/'} — ${new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

  const snapshot: SnapshotRecord = {
    id: uuid(),
    origin,
    name: auto,
    timestamp: Math.floor(now / 1000),
    data: {
      cookies,
      localStorage: probe.localStorage,
      sessionStorage: probe.sessionStorage,
    },
  }

  return snapshot
}
