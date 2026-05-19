<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import type { PurgeImpact, PurgeOptions, TabSummary } from '@/lib/schema'
import { DEFAULT_PURGE_OPTIONS } from '@/lib/schema'
import { sendExtensionMessage } from '@/composables/useMessaging'
import { RESTRICTED_PAGE_USER_MESSAGE } from '@/lib/extensionErrors'
import PurgeImpactModal from '@/components/PurgeImpactModal.vue'

const props = defineProps<{
  tabId: number | null
  origin: string | null
  url: string | null
  restricted: boolean
}>()

const summary = ref<TabSummary | null>(null)
const summaryErr = ref<string | null>(null)
const loadingSummary = ref(false)

const opts = reactive<PurgeOptions>({ ...DEFAULT_PURGE_OPTIONS })

const cookieWlDraft = ref('')
const lsWlDraft = ref('')

function parseLines(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function syncDraftsFromOpts(): void {
  cookieWlDraft.value = opts.whitelistCookieNames.join('\n')
  lsWlDraft.value = opts.whitelistLocalStorageKeys.join('\n')
}

function applyWhitelistDrafts(): void {
  opts.whitelistCookieNames = parseLines(cookieWlDraft.value)
  opts.whitelistLocalStorageKeys = parseLines(lsWlDraft.value)
}

watch(
  () => [...opts.whitelistCookieNames],
  () => {
    cookieWlDraft.value = opts.whitelistCookieNames.join('\n')
  },
)

watch(
  () => [...opts.whitelistLocalStorageKeys],
  () => {
    lsWlDraft.value = opts.whitelistLocalStorageKeys.join('\n')
  },
)

const purgeWorking = ref(false)
const purgeErr = ref<string | null>(null)
const impactOpen = ref(false)
const impact = ref<PurgeImpact | null>(null)
const impactErr = ref<string | null>(null)

async function refreshSummary() {
  if (props.restricted || props.tabId == null || !props.origin || !props.url) {
    summary.value = null
    return
  }
  loadingSummary.value = true
  summaryErr.value = null
  try {
    const r = await sendExtensionMessage<{ ok: boolean; summary?: TabSummary; error?: string }>(
      {
        type: 'GET_SUMMARY',
        tabId: props.tabId,
        origin: props.origin,
      },
    )
    if (!r.ok || !r.summary) summaryErr.value = r.error ?? 'Failed'
    else summary.value = r.summary
  } catch (e) {
    summaryErr.value = e instanceof Error ? e.message : String(e)
  } finally {
    loadingSummary.value = false
  }
}

async function requestPurge() {
  purgeErr.value = null
  impactErr.value = null
  if (props.tabId == null || !props.origin || !props.url) return
  applyWhitelistDrafts()
  try {
    const r = await sendExtensionMessage<{
      ok: boolean
      impact?: PurgeImpact
      error?: string
    }>({
      type: 'GET_PURGE_IMPACT',
      tabId: props.tabId,
      origin: props.origin,
      url: props.url,
      options: { ...opts },
    })
    if (!r.ok || !r.impact) {
      impactErr.value = r.error ?? 'Preview failed'
      return
    }
    impact.value = r.impact
    impactOpen.value = true
  } catch (e) {
    impactErr.value = e instanceof Error ? e.message : String(e)
  }
}

async function runPurge() {
  impactOpen.value = false
  if (props.tabId == null || !props.origin || !props.url) return
  applyWhitelistDrafts()
  purgeWorking.value = true
  purgeErr.value = null
  try {
    const r = await sendExtensionMessage<{ ok: boolean; error?: string }>({
      type: 'PURGE_ORIGIN',
      tabId: props.tabId,
      origin: props.origin,
      url: props.url,
      options: { ...opts },
    })
    if (!r.ok) purgeErr.value = r.error ?? 'Purge failed'
    await refreshSummary()
  } catch (e) {
    purgeErr.value = e instanceof Error ? e.message : String(e)
  } finally {
    purgeWorking.value = false
  }
}

watch(
  () =>
    props.restricted || props.tabId == null || !props.origin || !props.url
      ? null
      : `${props.tabId}|${props.origin}|${props.url}`,
  (key) => {
    if (key == null) {
      summary.value = null
      summaryErr.value = null
      return
    }
    void refreshSummary()
  },
  { immediate: true },
)

onMounted(() => {
  syncDraftsFromOpts()
})

defineExpose({
  opts,
  refreshSummary,
  syncDraftsFromOpts,
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <div
      v-if="restricted"
      class="rounded-md bg-amber-50 px-2 py-2 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
    >
      {{ RESTRICTED_PAGE_USER_MESSAGE }}
    </div>

    <template v-else>
      <div class="rounded-card border border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] dark:border-neutral-800 dark:bg-neutral-900/40">
        <p v-if="loadingSummary" class="text-neutral-500">Reading storage…</p>
        <p v-else-if="summaryErr" class="text-red-600">{{ summaryErr }}</p>
        <p v-else-if="summary" class="text-neutral-700 dark:text-neutral-300">
          <span class="font-medium">{{ summary.cookies }}</span> cookies ·
          <span class="font-medium">{{ summary.localStorageKeys }}</span> localStorage keys ·
          <span class="font-medium">{{ summary.sessionStorageKeys }}</span> sessionStorage keys
        </p>
        <p v-else class="text-neutral-500">No summary yet.</p>
        <button
          type="button"
          class="mt-2 text-[11px] font-medium text-orange-700 hover:underline dark:text-orange-400"
          @click="refreshSummary"
        >
          Refresh counts
        </button>
      </div>

      <fieldset class="space-y-2 border-0 p-0">
        <legend class="sr-only">Data to purge</legend>
        <label class="flex items-center gap-2 text-xs">
          <input v-model="opts.cookies" type="checkbox" class="rounded border-neutral-300" />
          Cookies
        </label>
        <label class="flex items-center gap-2 text-xs">
          <input
            v-model="opts.preserveSessionCookies"
            type="checkbox"
            class="rounded border-neutral-300"
            :disabled="!opts.cookies"
          />
          Preserve session cookies
        </label>
        <label class="flex items-center gap-2 text-xs">
          <input v-model="opts.localStorage" type="checkbox" class="rounded border-neutral-300" />
          LocalStorage
        </label>
        <label class="flex items-center gap-2 text-xs">
          <input v-model="opts.sessionStorage" type="checkbox" class="rounded border-neutral-300" />
          SessionStorage
        </label>
        <label class="flex items-center gap-2 text-xs">
          <input v-model="opts.indexedDB" type="checkbox" class="rounded border-neutral-300" />
          IndexedDB
        </label>
        <label class="flex items-center gap-2 text-xs">
          <input v-model="opts.cacheStorage" type="checkbox" class="rounded border-neutral-300" />
          Cache storage
        </label>
        <label class="flex items-center gap-2 text-xs">
          <input v-model="opts.serviceWorkers" type="checkbox" class="rounded border-neutral-300" />
          Service workers (unregister + data)
        </label>
      </fieldset>

      <details class="group rounded-card border border-neutral-200 dark:border-neutral-800">
        <summary
          class="cursor-pointer select-none list-none px-3 py-2 text-xs font-semibold text-neutral-800 marker:hidden dark:text-neutral-100 [&::-webkit-details-marker]:hidden"
        >
          Keep (whitelist)
        </summary>
        <div class="border-t border-neutral-100 px-2 pb-2 pt-2 dark:border-neutral-800">
          <p class="mb-2 text-[10px] text-neutral-500">
            Cookie names &amp; localStorage keys to preserve (one per line or comma). Applies when those data types are selected above.
          </p>
          <label class="mb-1 block text-[10px] font-medium text-neutral-600 dark:text-neutral-400"
            >Cookie names</label
          >
          <textarea
            v-model="cookieWlDraft"
            rows="2"
            placeholder="session_id&#10;auth_token"
            class="mb-2 w-full resize-none rounded-md border border-neutral-200 bg-white p-1.5 font-mono text-[10px] dark:border-neutral-700 dark:bg-neutral-900"
          />
          <label class="mb-1 block text-[10px] font-medium text-neutral-600 dark:text-neutral-400"
            >localStorage keys</label
          >
          <textarea
            v-model="lsWlDraft"
            rows="2"
            placeholder="persist:root&#10;feature_flags"
            class="w-full resize-none rounded-md border border-neutral-200 bg-white p-1.5 font-mono text-[10px] dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
      </details>

      <p v-if="impactErr" class="text-[11px] text-red-600">{{ impactErr }}</p>
      <p v-if="purgeErr" class="text-[11px] text-red-600">{{ purgeErr }}</p>

      <button
        type="button"
        class="w-full rounded-lg bg-orange-600 py-2 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-40"
        :disabled="purgeWorking || tabId == null"
        @click="requestPurge"
      >
        {{ purgeWorking ? 'Working…' : 'Preview & clear' }}
      </button>
    </template>

    <PurgeImpactModal
      :open="impactOpen"
      :impact="impact"
      @confirm="runPurge"
      @cancel="impactOpen = false"
    />
  </div>
</template>
