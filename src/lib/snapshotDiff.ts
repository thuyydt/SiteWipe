import type { SnapshotCompareEntry, SnapshotCookie, SnapshotData } from '@/lib/schema'

function cookieKey(c: SnapshotCookie): string {
  return `${c.domain}\t${c.path}\t${c.name}`
}

function cookieMap(data: SnapshotData): Map<string, SnapshotCookie> {
  const m = new Map<string, SnapshotCookie>()
  for (const c of data.cookies) {
    m.set(cookieKey(c), c)
  }
  return m
}

function storageDiff(
  area: 'localStorage' | 'sessionStorage',
  left: Record<string, string>,
  right: Record<string, string>,
  out: SnapshotCompareEntry[],
): void {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  for (const key of keys) {
    const lv = left[key]
    const rv = right[key]
    if (lv === undefined && rv !== undefined) {
      out.push({ area, key, change: 'added', right: rv })
    } else if (lv !== undefined && rv === undefined) {
      out.push({ area, key, change: 'removed', left: lv })
    } else if (lv !== rv) {
      out.push({ area, key, change: 'changed', left: lv, right: rv })
    }
  }
}

/** Diff two frozen snapshots (cookies + storages). */
export function diffSnapshotData(a: SnapshotData, b: SnapshotData): SnapshotCompareEntry[] {
  const out: SnapshotCompareEntry[] = []
  storageDiff('localStorage', a.localStorage, b.localStorage, out)
  storageDiff('sessionStorage', a.sessionStorage, b.sessionStorage, out)

  const ma = cookieMap(a)
  const mb = cookieMap(b)
  const keys = new Set([...ma.keys(), ...mb.keys()])
  for (const k of keys) {
    const ca = ma.get(k)
    const cb = mb.get(k)
    const detail = ca
      ? `${ca.domain} · ${ca.path}`
      : cb
        ? `${cb.domain} · ${cb.path}`
        : undefined
    const name = ca?.name ?? cb?.name ?? k
    if (!ca && cb) {
      out.push({
        area: 'cookie',
        key: name,
        detail,
        change: 'added',
        right: cb.value,
      })
    } else if (ca && !cb) {
      out.push({
        area: 'cookie',
        key: name,
        detail,
        change: 'removed',
        left: ca.value,
      })
    } else if (ca && cb && ca.value !== cb.value) {
      out.push({
        area: 'cookie',
        key: name,
        detail,
        change: 'changed',
        left: ca.value,
        right: cb.value,
      })
    }
  }
  return out
}
