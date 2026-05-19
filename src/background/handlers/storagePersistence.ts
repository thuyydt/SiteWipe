import browser from '@/extension/browser'
import type { PurgeProfile, SnapshotRecord } from '@/lib/schema'
import { DEFAULT_PURGE_OPTIONS } from '@/lib/schema'

const PROFILES_KEY = 'profiles'
const SNAPSHOTS_KEY = 'snapshots'
const AUTO_WATCH_KEY = 'autoWatchOrigins'

export async function readProfiles(): Promise<PurgeProfile[]> {
  const r = await browser.storage.local.get(PROFILES_KEY)
  const v = r[PROFILES_KEY]
  if (!Array.isArray(v)) return []
  return (v as PurgeProfile[]).map((p) => ({
    ...p,
    purge: {
      ...DEFAULT_PURGE_OPTIONS,
      ...p.purge,
      whitelistCookieNames: p.purge.whitelistCookieNames ?? [],
      whitelistLocalStorageKeys: p.purge.whitelistLocalStorageKeys ?? [],
    },
  }))
}

export async function writeProfiles(profiles: PurgeProfile[]): Promise<void> {
  await browser.storage.local.set({ [PROFILES_KEY]: profiles })
}

export async function readSnapshots(): Promise<SnapshotRecord[]> {
  const r = await browser.storage.local.get(SNAPSHOTS_KEY)
  const v = r[SNAPSHOTS_KEY]
  return Array.isArray(v) ? (v as SnapshotRecord[]) : []
}

export async function writeSnapshots(snapshots: SnapshotRecord[]): Promise<void> {
  await browser.storage.local.set({ [SNAPSHOTS_KEY]: snapshots })
}

export async function readAutoWatchOrigins(): Promise<string[]> {
  const r = await browser.storage.local.get(AUTO_WATCH_KEY)
  const v = r[AUTO_WATCH_KEY]
  return Array.isArray(v) ? (v as string[]) : []
}

export async function writeAutoWatchOrigins(origins: string[]): Promise<void> {
  await browser.storage.local.set({ [AUTO_WATCH_KEY]: origins })
}
