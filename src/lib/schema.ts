/** Matches docs/5_Schema.md snapshot entries in extension local storage */

/** SameSite values from the WebExtensions cookies API */
export type CookieSameSite = 'no_restriction' | 'lax' | 'strict' | 'unspecified'

export interface SnapshotCookie {
  name: string
  value: string
  domain: string
  path: string
  secure?: boolean
  httpOnly?: boolean
  sameSite?: CookieSameSite
  expirationDate?: number
  /** Present when captured via cookies.getAll */
  session?: boolean
}

export interface SnapshotData {
  cookies: SnapshotCookie[]
  localStorage: Record<string, string>
  sessionStorage: Record<string, string>
}

export interface SnapshotRecord {
  id: string
  origin: string
  name: string
  timestamp: number
  data: SnapshotData
}

export interface SnapshotStorageShape {
  snapshots: SnapshotRecord[]
}

export interface PurgeOptions {
  cookies: boolean
  /** When cookies true: keep cookies where session === true */
  preserveSessionCookies: boolean
  /** Cookie names kept when clearing cookies (exact match). */
  whitelistCookieNames: string[]
  /** localStorage keys restored after a localStorage wipe (exact key names). */
  whitelistLocalStorageKeys: string[]
  localStorage: boolean
  sessionStorage: boolean
  indexedDB: boolean
  cacheStorage: boolean
  serviceWorkers: boolean
}

export const DEFAULT_PURGE_OPTIONS: PurgeOptions = {
  cookies: true,
  preserveSessionCookies: false,
  whitelistCookieNames: [],
  whitelistLocalStorageKeys: [],
  localStorage: true,
  sessionStorage: true,
  indexedDB: true,
  cacheStorage: true,
  serviceWorkers: true,
}

export interface PurgeImpact {
  origin: string
  cookieCount: number
  localStorageKeys: number
  sessionStorageKeys: number
  dataTypes: string[]
  mayAffectLogin: boolean
  whitelistCookies: number
  whitelistLocalStorage: number
}

export interface PurgeProfile {
  id: string
  name: string
  /** Checkbox snapshot */
  purge: PurgeOptions
  /** Hostnames (no scheme) that suggest this preset in Profiles (e.g. app.example.com). */
  matchOrigins?: string[]
}

export interface ProfilesStorageShape {
  profiles: PurgeProfile[]
}

/** Serializable subset of CookiePartitionKey for messaging */
export interface InspectCookiePartitionKey {
  topLevelSite?: string
}

/** Cookie row for Inspect tab (serializable subset of cookies API Cookie) */
export interface InspectCookie {
  name: string
  value: string
  domain: string
  path: string
  secure: boolean
  httpOnly: boolean
  sameSite?: CookieSameSite
  session?: boolean
  expirationDate?: number
  storeId?: string
  partitionKey?: InspectCookiePartitionKey
}

export interface CookieUpsertPayload {
  name: string
  value: string
  domain: string
  path: string
  secure: boolean
  httpOnly: boolean
  sameSite?: CookieSameSite
  session: boolean
  expirationDate?: number
  storeId?: string
  partitionKey?: InspectCookiePartitionKey
}

export interface CookieRemovePayload {
  name: string
  domain: string
  path: string
  secure?: boolean
  storeId?: string
  partitionKey?: InspectCookiePartitionKey
}

export interface ServiceWorkerInspectRow {
  scope: string
  scriptURL: string
  state: string
}

export interface CacheInspectEntry {
  cacheName: string
  urls: string[]
  truncated: boolean
}

export interface IndexedDbInspectDb {
  name: string
  version: number
  stores: string[]
}

export interface IndexedDbInspectSummary {
  databases: IndexedDbInspectDb[]
  errors: string[]
}

export interface IndexedDbSampleRow {
  key: unknown
  value: unknown
}

export interface TabSummary {
  cookies: number
  localStorageKeys: number
  sessionStorageKeys: number
}

export interface RestoreDiffEntry {
  key: string
  storage: 'localStorage' | 'sessionStorage'
  before?: string
  after?: string
}

export interface SnapshotCompareEntry {
  area: 'cookie' | 'localStorage' | 'sessionStorage'
  key: string
  detail?: string
  change: 'added' | 'removed' | 'changed'
  left?: string
  right?: string
}

/** Shape produced by COPY_MOCK_PAYLOAD / portable JSON import */
export interface EnvPayload {
  origin?: string
  capturedAt?: string
  localStorage?: Record<string, string>
  sessionStorage?: Record<string, string>
  cookies?: Array<{
    name: string
    value: string
    domain: string
    path: string
    secure?: boolean
    httpOnly?: boolean
    sameSite?: CookieSameSite
    expirationDate?: number
    session?: boolean
  }>
}

/** Typed runtime messages popup ↔ service worker */

export type ExtensionRequest =
  | { type: 'GET_ACTIVE_TAB_CONTEXT' }
  | { type: 'GET_SUMMARY'; tabId: number; origin: string }
  | {
      type: 'GET_STORAGE_TABLE'
      tabId: number
    }
  | {
      type: 'SET_STORAGE_VALUE'
      tabId: number
      storage: 'localStorage' | 'sessionStorage'
      key: string
      value: string
    }
  | {
      type: 'DELETE_STORAGE_KEY'
      tabId: number
      storage: 'localStorage' | 'sessionStorage'
      key: string
    }
  | {
      type: 'PURGE_ORIGIN'
      tabId: number
      origin: string
      url: string
      options: PurgeOptions
    }
  | { type: 'LOAD_PROFILES' }
  | { type: 'SAVE_PROFILES'; profiles: PurgeProfile[] }
  | { type: 'LOAD_SNAPSHOTS' }
  | { type: 'SAVE_SNAPSHOTS'; snapshots: SnapshotRecord[] }
  | { type: 'CAPTURE_SNAPSHOT'; tabId: number; origin: string; url: string; name?: string }
  | {
      type: 'RESTORE_SNAPSHOT'
      tabId: number
      snapshot: SnapshotRecord
      skipReload?: boolean
    }
  | {
      type: 'GET_RESTORE_DIFF'
      tabId: number
      snapshot: SnapshotRecord
    }
  | {
      type: 'COPY_MOCK_PAYLOAD'
      tabId: number
      origin: string
      url: string
    }
  | {
      type: 'COPY_CLI_SCRIPT'
      tabId: number
      origin: string
      url: string
    }
  | {
      type: 'KILL_AND_RELOAD'
      tabId: number
      origin: string
      url: string
    }
  | { type: 'COOKIE_UPSERT'; tabId: number; pageUrl: string; cookie: CookieUpsertPayload }
  | { type: 'COOKIE_REMOVE'; tabId: number; pageUrl: string; remove: CookieRemovePayload }
  | { type: 'GET_INSPECT_SERVICE_WORKERS'; tabId: number }
  | { type: 'UNREGISTER_SERVICE_WORKER_SCOPE'; tabId: number; scope: string }
  | { type: 'GET_INSPECT_CACHE_STORAGE'; tabId: number }
  | { type: 'GET_INSPECT_INDEXEDDB_SUMMARY'; tabId: number }
  | {
      type: 'GET_INSPECT_INDEXEDDB_STORE_SAMPLE'
      tabId: number
      dbName: string
      storeName: string
    }
  | {
      type: 'GET_PURGE_IMPACT'
      tabId: number
      origin: string
      url: string
      options: PurgeOptions
    }
  | { type: 'COMPARE_SNAPSHOT_DATA'; left: SnapshotRecord; right: SnapshotRecord }
  | {
      type: 'GET_SNAPSHOT_VS_LIVE_DIFF'
      tabId: number
      url: string
      snapshot: SnapshotRecord
    }
  | { type: 'APPLY_ENV_PAYLOAD'; tabId: number; url: string; payload: EnvPayload }
  | { type: 'GET_AUTO_WATCH_ORIGINS' }
  | { type: 'SET_AUTO_WATCH_ORIGINS'; origins: string[] }

export type ExtensionResponse<T extends ExtensionRequest['type']> =
  T extends 'GET_ACTIVE_TAB_CONTEXT'
    ? {
        ok: true
        tabId: number | null
        origin: string | null
        url: string | null
        title: string | null
        restricted: boolean
      }
    : T extends 'GET_SUMMARY'
      ? { ok: true; summary: TabSummary } | { ok: false; error: string }
      : T extends 'GET_STORAGE_TABLE'
        ?
            | {
                ok: true
                localStorage: Record<string, string>
                sessionStorage: Record<string, string>
                sharedStorageAvailable: boolean
                cookies: InspectCookie[]
              }
            | { ok: false; error: string }
        : T extends 'SET_STORAGE_VALUE' | 'DELETE_STORAGE_KEY'
          ? { ok: true } | { ok: false; error: string }
          : T extends 'PURGE_ORIGIN'
            ? { ok: true } | { ok: false; error: string }
            : T extends 'LOAD_PROFILES'
              ? { ok: true; profiles: PurgeProfile[] }
              : T extends 'SAVE_PROFILES'
                ? { ok: true }
                : T extends 'LOAD_SNAPSHOTS'
                  ? { ok: true; snapshots: SnapshotRecord[] }
                  : T extends 'SAVE_SNAPSHOTS'
                    ? { ok: true }
                    : T extends 'CAPTURE_SNAPSHOT'
                      ? { ok: true; snapshot: SnapshotRecord } | { ok: false; error: string }
                      : T extends 'RESTORE_SNAPSHOT'
                        ? { ok: true } | { ok: false; error: string }
                        : T extends 'GET_RESTORE_DIFF'
                          ?
                              | { ok: true; diff: RestoreDiffEntry[] }
                              | { ok: false; error: string }
                          : T extends 'COPY_MOCK_PAYLOAD'
                            ? { ok: true; json: string } | { ok: false; error: string }
                            : T extends 'COPY_CLI_SCRIPT'
                              ? { ok: true; script: string } | { ok: false; error: string }
                              : T extends 'KILL_AND_RELOAD'
                                ? { ok: true } | { ok: false; error: string }
                                : T extends 'COOKIE_UPSERT'
                                  ? { ok: true } | { ok: false; error: string }
                                  : T extends 'COOKIE_REMOVE'
                                    ? { ok: true } | { ok: false; error: string }
                                    : T extends 'GET_INSPECT_SERVICE_WORKERS'
                                      ?
                                          | { ok: true; registrations: ServiceWorkerInspectRow[] }
                                          | { ok: false; error: string }
                                      : T extends 'UNREGISTER_SERVICE_WORKER_SCOPE'
                                        ? { ok: true } | { ok: false; error: string }
                                        : T extends 'GET_INSPECT_CACHE_STORAGE'
                                          ?
                                              | { ok: true; caches: CacheInspectEntry[] }
                                              | { ok: false; error: string }
                                          : T extends 'GET_INSPECT_INDEXEDDB_SUMMARY'
                                            ?
                                                | { ok: true; summary: IndexedDbInspectSummary }
                                                | { ok: false; error: string }
                                            : T extends 'GET_INSPECT_INDEXEDDB_STORE_SAMPLE'
                                              ?
                                                  | {
                                                      ok: true
                                                      rows: IndexedDbSampleRow[]
                                                    }
                                                  | { ok: false; error: string }
                                              : T extends 'GET_PURGE_IMPACT'
                                                ?
                                                    | { ok: true; impact: PurgeImpact }
                                                    | { ok: false; error: string }
                                                : T extends 'COMPARE_SNAPSHOT_DATA'
                                                  ?
                                                      | { ok: true; diff: SnapshotCompareEntry[] }
                                                      | { ok: false; error: string }
                                                  : T extends 'GET_SNAPSHOT_VS_LIVE_DIFF'
                                                    ?
                                                        | { ok: true; diff: SnapshotCompareEntry[] }
                                                        | { ok: false; error: string }
                                                    : T extends 'APPLY_ENV_PAYLOAD'
                                                      ? { ok: true } | { ok: false; error: string }
                                                      : T extends 'GET_AUTO_WATCH_ORIGINS'
                                                        ? { ok: true; origins: string[] }
                                                        : T extends 'SET_AUTO_WATCH_ORIGINS'
                                                          ? { ok: true }
                                                          : never
