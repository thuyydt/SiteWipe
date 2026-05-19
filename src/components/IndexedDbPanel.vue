<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { IndexedDbInspectDb, IndexedDbSampleRow } from '@/lib/schema'
import { sendExtensionMessage } from '@/composables/useMessaging'
import { RESTRICTED_PAGE_USER_MESSAGE } from '@/lib/extensionErrors'

const props = defineProps<{
  tabId: number | null
  restricted: boolean
}>()

const databases = ref<IndexedDbInspectDb[]>([])
const summaryErrors = ref<string[]>([])
const loading = ref(false)
const err = ref<string | null>(null)

const expandedSample = ref<{ dbName: string; storeName: string } | null>(null)
const sampleRows = ref<IndexedDbSampleRow[]>([])
const sampleLoading = ref(false)
const sampleErr = ref<string | null>(null)

async function loadSummary() {
  if (props.restricted || props.tabId == null) return
  loading.value = true
  err.value = null
  try {
    const r = await sendExtensionMessage<{
      ok: boolean
      summary?: { databases: IndexedDbInspectDb[]; errors: string[] }
      error?: string
    }>({ type: 'GET_INSPECT_INDEXEDDB_SUMMARY', tabId: props.tabId })
    if (!r.ok || !r.summary) err.value = r.error ?? 'Failed'
    else {
      databases.value = r.summary.databases
      summaryErrors.value = r.summary.errors
    }
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

async function loadSample(dbName: string, storeName: string) {
  if (props.tabId == null) return
  expandedSample.value = { dbName, storeName }
  sampleLoading.value = true
  sampleErr.value = null
  sampleRows.value = []
  try {
    const r = await sendExtensionMessage<{
      ok: boolean
      rows?: IndexedDbSampleRow[]
      error?: string
    }>({
      type: 'GET_INSPECT_INDEXEDDB_STORE_SAMPLE',
      tabId: props.tabId,
      dbName,
      storeName,
    })
    if (!r.ok) sampleErr.value = r.error ?? 'Sample failed'
    else sampleRows.value = r.rows ?? []
  } catch (e) {
    sampleErr.value = e instanceof Error ? e.message : String(e)
  } finally {
    sampleLoading.value = false
  }
}

async function copySample() {
  await navigator.clipboard.writeText(JSON.stringify(sampleRows.value, null, 2))
}

onMounted(loadSummary)
</script>

<template>
  <div class="flex flex-col gap-2 pt-1">
    <p v-if="restricted" class="text-[11px] text-amber-800 dark:text-amber-200">
      {{ RESTRICTED_PAGE_USER_MESSAGE }}
    </p>
    <template v-else>
      <div class="flex items-center justify-between gap-2">
        <span class="text-[10px] text-neutral-500">{{ loading ? 'Loading…' : `${databases.length} database(s)` }}</span>
        <button
          type="button"
          class="text-[11px] font-medium text-orange-700 hover:underline dark:text-orange-400"
          @click="loadSummary"
        >
          Refresh
        </button>
      </div>
      <p v-if="err" class="text-[11px] text-red-600">{{ err }}</p>
      <ul v-if="summaryErrors.length" class="rounded-md bg-amber-50 px-2 py-1 text-[10px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        <li v-for="(e, i) in summaryErrors" :key="i">{{ e }}</li>
      </ul>

      <div class="max-h-52 space-y-2 overflow-auto">
        <details
          v-for="(db, di) in databases"
          :key="`${db.name}-${db.version}-${di}`"
          class="rounded-lg border border-neutral-200 dark:border-neutral-800"
        >
          <summary class="cursor-pointer px-2 py-1.5 text-[11px] font-medium">
            {{ db.name }} <span class="font-normal text-neutral-500">v{{ db.version }}</span>
          </summary>
          <ul class="border-t border-neutral-100 px-2 py-1 dark:border-neutral-800">
            <li v-for="store in db.stores" :key="store" class="flex flex-wrap items-center gap-2 py-0.5">
              <span class="font-mono text-[10px]">{{ store }}</span>
              <button
                type="button"
                class="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                @click="loadSample(db.name, store)"
              >
                Sample rows
              </button>
            </li>
          </ul>
        </details>
      </div>

      <div
        v-if="expandedSample"
        class="rounded-card border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-900/60"
      >
        <div class="mb-1 flex items-center justify-between gap-2">
          <span class="text-[11px] font-medium">
            Sample:
            <span class="font-mono text-neutral-600">{{ expandedSample.dbName }} / {{ expandedSample.storeName }}</span>
          </span>
          <button
            type="button"
            class="text-[10px] font-medium text-orange-700 dark:text-orange-400"
            @click="copySample"
          >
            Copy JSON
          </button>
        </div>
        <p v-if="sampleLoading" class="text-[10px] text-neutral-500">Loading sample…</p>
        <p v-if="sampleErr" class="text-[10px] text-red-600">{{ sampleErr }}</p>
        <textarea
          readonly
          :value="JSON.stringify(sampleRows, null, 2)"
          rows="8"
          class="w-full resize-y rounded-md border border-neutral-200 bg-white p-2 font-mono text-[9px] dark:border-neutral-700 dark:bg-neutral-950"
        />
      </div>

      <p class="text-[10px] leading-snug text-neutral-500 dark:text-neutral-400">
        Read-only browse: capped databases and sample rows. Blob/binary shown as placeholders. Editing IndexedDB here is not supported — use Purge to clear or DevTools.
      </p>
    </template>
  </div>
</template>
