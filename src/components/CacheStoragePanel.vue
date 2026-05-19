<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { CacheInspectEntry } from '@/lib/schema'
import { sendExtensionMessage } from '@/composables/useMessaging'
import { RESTRICTED_PAGE_USER_MESSAGE } from '@/lib/extensionErrors'

const props = defineProps<{
  tabId: number | null
  restricted: boolean
}>()

const caches = ref<CacheInspectEntry[]>([])
const loading = ref(false)
const err = ref<string | null>(null)

async function load() {
  if (props.restricted || props.tabId == null) return
  loading.value = true
  err.value = null
  try {
    const r = await sendExtensionMessage<{
      ok: boolean
      caches?: CacheInspectEntry[]
      error?: string
    }>({ type: 'GET_INSPECT_CACHE_STORAGE', tabId: props.tabId })
    if (!r.ok) err.value = r.error ?? 'Failed'
    else caches.value = r.caches ?? []
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-2 pt-1">
    <p v-if="restricted" class="text-[11px] text-amber-800 dark:text-amber-200">
      {{ RESTRICTED_PAGE_USER_MESSAGE }}
    </p>
    <template v-else>
      <div class="flex items-center justify-between gap-2">
        <span class="text-[10px] text-neutral-500">{{ loading ? 'Loading…' : `${caches.length} cache(s)` }}</span>
        <button
          type="button"
          class="text-[11px] font-medium text-orange-700 hover:underline dark:text-orange-400"
          @click="load"
        >
          Refresh
        </button>
      </div>
      <p v-if="err" class="text-[11px] text-red-600">{{ err }}</p>
      <div class="max-h-48 space-y-2 overflow-auto">
        <details
          v-for="(c, i) in caches"
          :key="`${c.cacheName}-${i}`"
          class="rounded-lg border border-neutral-200 dark:border-neutral-800"
        >
          <summary class="cursor-pointer px-2 py-1.5 text-[11px] font-medium">
            {{ c.cacheName }}
            <span class="font-normal text-neutral-500">
              — {{ c.urls.length }} URLs{{ c.truncated ? '+' : '' }}
            </span>
          </summary>
          <ul class="max-h-28 overflow-auto border-t border-neutral-100 px-2 py-1 dark:border-neutral-800">
            <li
              v-for="(u, j) in c.urls"
              :key="j"
              class="truncate font-mono text-[9px] text-neutral-600 dark:text-neutral-400"
              :title="u"
            >
              {{ u }}
            </li>
          </ul>
        </details>
        <p v-if="!loading && caches.length === 0" class="py-4 text-center text-[11px] text-neutral-500">
          No caches
        </p>
      </div>
      <p class="text-[10px] text-neutral-500 dark:text-neutral-400">
        Read-only. Large caches are capped per cache for performance.
      </p>
    </template>
  </div>
</template>
