<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import StorageTable from '@/components/StorageTable.vue'
import CookieTable from '@/components/CookieTable.vue'
import ServiceWorkerTable from '@/components/ServiceWorkerTable.vue'
import CacheStoragePanel from '@/components/CacheStoragePanel.vue'
import IndexedDbPanel from '@/components/IndexedDbPanel.vue'
import { sendExtensionMessage } from '@/composables/useMessaging'
import { RESTRICTED_PAGE_USER_MESSAGE } from '@/lib/extensionErrors'
import type { InspectCookie } from '@/lib/schema'

const props = defineProps<{
  tabId: number | null
  url: string | null
  restricted: boolean
}>()

const localStorage = ref<Record<string, string>>({})
const sessionStorage = ref<Record<string, string>>({})
const cookies = ref<InspectCookie[]>([])
const sharedStorageAvailable = ref(false)

const err = ref<string | null>(null)
const loading = ref(false)

const swReady = ref(false)
const cacheReady = ref(false)
const idbReady = ref(false)

function onSwToggle(e: Event) {
  const el = e.target as HTMLDetailsElement
  if (el.open) swReady.value = true
}

function onCacheToggle(e: Event) {
  const el = e.target as HTMLDetailsElement
  if (el.open) cacheReady.value = true
}

function onIdbToggle(e: Event) {
  const el = e.target as HTMLDetailsElement
  if (el.open) idbReady.value = true
}

async function refreshTable() {
  if (props.restricted || props.tabId == null) return
  loading.value = true
  err.value = null
  try {
    const r = await sendExtensionMessage<{
      ok: boolean
      localStorage?: Record<string, string>
      sessionStorage?: Record<string, string>
      sharedStorageAvailable?: boolean
      cookies?: InspectCookie[]
      error?: string
    }>({ type: 'GET_STORAGE_TABLE', tabId: props.tabId })
    if (!r.ok) err.value = r.error ?? 'Failed to read inspect data'
    else {
      localStorage.value = r.localStorage ?? {}
      sessionStorage.value = r.sessionStorage ?? {}
      sharedStorageAvailable.value = r.sharedStorageAvailable ?? false
      cookies.value = r.cookies ?? []
    }
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

watch(
  () => props.tabId,
  () => {
    swReady.value = false
    cacheReady.value = false
    idbReady.value = false
    void refreshTable()
  },
)

async function onUpdate(payload: {
  storage: 'localStorage' | 'sessionStorage'
  key: string
  value: string
}) {
  if (props.tabId == null) return
  const r = await sendExtensionMessage<{ ok: boolean; error?: string }>({
    type: 'SET_STORAGE_VALUE',
    tabId: props.tabId,
    storage: payload.storage,
    key: payload.key,
    value: payload.value,
  })
  if (!r.ok) err.value = r.error ?? 'Save failed'
  await refreshTable()
}

async function onDelete(payload: {
  storage: 'localStorage' | 'sessionStorage'
  key: string
}) {
  if (props.tabId == null) return
  const r = await sendExtensionMessage<{ ok: boolean; error?: string }>({
    type: 'DELETE_STORAGE_KEY',
    tabId: props.tabId,
    storage: payload.storage,
    key: payload.key,
  })
  if (!r.ok) err.value = r.error ?? 'Delete failed'
  await refreshTable()
}

const pageUrl = () => props.url ?? ''

onMounted(refreshTable)
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-if="restricted" class="text-[11px] text-amber-800 dark:text-amber-200">
      {{ RESTRICTED_PAGE_USER_MESSAGE }}
    </div>

    <template v-else>
      <div class="flex items-center justify-between gap-2">
        <span class="text-[11px] text-neutral-500">{{ loading ? 'Loading…' : 'Top frame · grouped by storage type' }}</span>
        <button
          type="button"
          class="text-[11px] font-medium text-orange-700 hover:underline dark:text-orange-400"
          @click="refreshTable"
        >
          Refresh
        </button>
      </div>
      <p v-if="err" class="text-[11px] text-red-600">{{ err }}</p>

      <div
        class="rounded-lg border border-neutral-200 bg-neutral-50/80 px-2 py-2 text-[11px] leading-snug text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-300"
      >
        <template v-if="sharedStorageAvailable">
          <strong class="font-medium">Shared Storage</strong>
          (Privacy Sandbox) is available in this context. Entries cannot be listed here —
          use Chrome DevTools → Application → Shared Storage.
        </template>
        <template v-else>
          <strong class="font-medium">Shared Storage</strong>
          API not detected on this page (or disabled). Use DevTools → Application if the site uses it.
        </template>
      </div>

      <details open class="group rounded-card border border-neutral-200 dark:border-neutral-800">
        <summary
          class="cursor-pointer select-none list-none px-3 py-2 text-xs font-semibold text-neutral-800 marker:hidden dark:text-neutral-100 [&::-webkit-details-marker]:hidden"
        >
          LocalStorage
        </summary>
        <div class="border-t border-neutral-100 px-2 pb-2 dark:border-neutral-800">
          <StorageTable
            storage-kind="localStorage"
            :entries="localStorage"
            section-label="Persisted for this origin"
            @update-value="onUpdate"
            @delete-key="onDelete"
          />
        </div>
      </details>

      <details open class="group rounded-card border border-neutral-200 dark:border-neutral-800">
        <summary
          class="cursor-pointer select-none list-none px-3 py-2 text-xs font-semibold text-neutral-800 marker:hidden dark:text-neutral-100 [&::-webkit-details-marker]:hidden"
        >
          SessionStorage
        </summary>
        <div class="border-t border-neutral-100 px-2 pb-2 dark:border-neutral-800">
          <StorageTable
            storage-kind="sessionStorage"
            :entries="sessionStorage"
            section-label="Tab-specific · cleared when tab closes"
            @update-value="onUpdate"
            @delete-key="onDelete"
          />
        </div>
      </details>

      <details open class="group rounded-card border border-neutral-200 dark:border-neutral-800">
        <summary
          class="cursor-pointer select-none list-none px-3 py-2 text-xs font-semibold text-neutral-800 marker:hidden dark:text-neutral-100 [&::-webkit-details-marker]:hidden"
        >
          Cookies
        </summary>
        <div class="border-t border-neutral-100 px-2 pb-2 dark:border-neutral-800">
          <CookieTable
            :cookies="cookies"
            :tab-id="tabId"
            :page-url="pageUrl()"
            :restricted="restricted"
            @refresh="refreshTable"
          />
        </div>
      </details>

      <details class="group rounded-card border border-neutral-200 dark:border-neutral-800" @toggle="onSwToggle">
        <summary
          class="cursor-pointer select-none list-none px-3 py-2 text-xs font-semibold text-neutral-800 marker:hidden dark:text-neutral-100 [&::-webkit-details-marker]:hidden"
        >
          Service workers
        </summary>
        <div class="border-t border-neutral-100 px-2 pb-2 dark:border-neutral-800">
          <ServiceWorkerTable v-if="swReady" :tab-id="tabId" :restricted="restricted" />
        </div>
      </details>

      <details class="group rounded-card border border-neutral-200 dark:border-neutral-800" @toggle="onCacheToggle">
        <summary
          class="cursor-pointer select-none list-none px-3 py-2 text-xs font-semibold text-neutral-800 marker:hidden dark:text-neutral-100 [&::-webkit-details-marker]:hidden"
        >
          Cache Storage
        </summary>
        <div class="border-t border-neutral-100 px-2 pb-2 dark:border-neutral-800">
          <CacheStoragePanel v-if="cacheReady" :tab-id="tabId" :restricted="restricted" />
        </div>
      </details>

      <details class="group rounded-card border border-neutral-200 dark:border-neutral-800" @toggle="onIdbToggle">
        <summary
          class="cursor-pointer select-none list-none px-3 py-2 text-xs font-semibold text-neutral-800 marker:hidden dark:text-neutral-100 [&::-webkit-details-marker]:hidden"
        >
          IndexedDB
        </summary>
        <div class="border-t border-neutral-100 px-2 pb-2 dark:border-neutral-800">
          <IndexedDbPanel v-if="idbReady" :tab-id="tabId" :restricted="restricted" />
        </div>
      </details>
    </template>
  </div>
</template>
