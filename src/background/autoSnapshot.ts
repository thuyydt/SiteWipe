/**
 * Shared utilities for the auto-snapshot feature: per-origin throttle, capture
 * helpers, and routing logic used by both the storage tick (content script) and
 * the cookie watch (browser.cookies.onChanged).
 */
import type Browser from 'webextension-polyfill'
import browser from '@/extension/browser'
import type { SnapshotCookie, SnapshotRecord } from '@/lib/schema'
import { captureSnapshot } from '@/background/handlers/snapshotCapture'
import { readAutoWatchOrigins, readSnapshots, writeSnapshots } from '@/background/handlers/storagePersistence'
import { isRestrictedUrl, originFromUrl } from '@/lib/permissions'

export const AUTO_MIN_MS = 15_000
export const AUTO_MAX_ENTRIES = 150
const PER_ORIGIN_DEBOUNCE_MS = 700

const lastCaptureByOrigin = new Map<string, number>()
const debounceByOrigin = new Map<string, ReturnType<typeof setTimeout>>()

function timeLabel(): string {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

async function findTabForOrigin(origin: string): Promise<Browser.Tabs.Tab | null> {
  try {
    const tabs = await browser.tabs.query({})
    for (const t of tabs) {
      const u = t.url
      if (!u || isRestrictedUrl(u)) continue
      if (originFromUrl(u) === origin) return t
    }
  } catch {
    /* ignore */
  }
  return null
}

async function captureCookiesOnly(origin: string, name: string): Promise<SnapshotRecord> {
  const url = `${origin}/`
  const raw = await browser.cookies.getAll({ url })
  const cookies: SnapshotCookie[] = raw.map((c) => ({
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
    id: crypto.randomUUID(),
    origin,
    name,
    timestamp: Math.floor(Date.now() / 1000),
    data: {
      cookies,
      localStorage: {},
      sessionStorage: {},
    },
  }
}

async function appendSnapshot(snap: SnapshotRecord): Promise<void> {
  const list = await readSnapshots()
  await writeSnapshots([snap, ...list].slice(0, AUTO_MAX_ENTRIES))
}

/**
 * Run a capture for `origin` if not throttled. Returns true when a snapshot
 * was actually appended.
 */
export async function autoCapture(params: {
  origin: string
  source: 'storage' | 'cookie' | 'baseline'
  preferTabId?: number
}): Promise<boolean> {
  const { origin, source, preferTabId } = params
  if (source !== 'baseline') {
    const now = Date.now()
    const last = lastCaptureByOrigin.get(origin) ?? 0
    if (now - last < AUTO_MIN_MS) return false
    lastCaptureByOrigin.set(origin, now)
  } else {
    lastCaptureByOrigin.set(origin, Date.now())
  }

  let snap: SnapshotRecord | null = null

  let tab: Browser.Tabs.Tab | null = null
  if (preferTabId != null) {
    try {
      const t = await browser.tabs.get(preferTabId)
      if (t.url && !isRestrictedUrl(t.url) && originFromUrl(t.url) === origin) {
        tab = t
      }
    } catch {
      /* tab closed */
    }
  }
  if (!tab) tab = await findTabForOrigin(origin)

  const label =
    source === 'baseline'
      ? `Auto · baseline · ${timeLabel()}`
      : source === 'cookie'
        ? `Auto · cookies · ${timeLabel()}`
        : `Auto · ${timeLabel()}`

  if (tab?.id != null && tab.url) {
    try {
      snap = await captureSnapshot({
        tabId: tab.id,
        origin,
        url: tab.url,
        name: label,
        title: tab.title ?? undefined,
      })
    } catch {
      /* fall through to cookies-only */
    }
  }

  if (!snap) {
    if (source === 'storage') return false
    try {
      snap = await captureCookiesOnly(origin, label)
    } catch {
      return false
    }
  }

  await appendSnapshot(snap)
  return true
}

/** Schedule a per-origin debounced cookie capture (skips when no origin watched). */
export async function scheduleCookieAutoCapture(origin: string): Promise<void> {
  const list = await readAutoWatchOrigins()
  if (!list.includes(origin)) return
  const existing = debounceByOrigin.get(origin)
  if (existing) clearTimeout(existing)
  const t = setTimeout(() => {
    debounceByOrigin.delete(origin)
    void autoCapture({ origin, source: 'cookie' })
  }, PER_ORIGIN_DEBOUNCE_MS)
  debounceByOrigin.set(origin, t)
}

/** Resolve which watched origins a cookie change applies to. */
export function cookieOriginsForChange(
  cookie: Browser.Cookies.Cookie,
  watched: ReadonlyArray<string>,
): string[] {
  const host = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain
  const out: string[] = []
  for (const o of watched) {
    try {
      const u = new URL(o)
      if (u.hostname === host || u.hostname.endsWith('.' + host) || host.endsWith('.' + u.hostname)) {
        out.push(o)
      }
    } catch {
      /* skip bad entry */
    }
  }
  return out
}
