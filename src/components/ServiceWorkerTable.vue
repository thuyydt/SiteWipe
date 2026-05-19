<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { ServiceWorkerInspectRow } from '@/lib/schema'
import { sendExtensionMessage } from '@/composables/useMessaging'
import { RESTRICTED_PAGE_USER_MESSAGE } from '@/lib/extensionErrors'

const props = defineProps<{
  tabId: number | null
  restricted: boolean
}>()

const registrations = ref<ServiceWorkerInspectRow[]>([])
const loading = ref(false)
const err = ref<string | null>(null)

async function load() {
  if (props.restricted || props.tabId == null) return
  loading.value = true
  err.value = null
  try {
    const r = await sendExtensionMessage<{
      ok: boolean
      registrations?: ServiceWorkerInspectRow[]
      error?: string
    }>({ type: 'GET_INSPECT_SERVICE_WORKERS', tabId: props.tabId })
    if (!r.ok) err.value = r.error ?? 'Failed'
    else registrations.value = r.registrations ?? []
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

async function unregister(scope: string) {
  if (!confirm(`Unregister service worker?\n${scope}`)) return
  if (props.tabId == null) return
  const r = await sendExtensionMessage<{ ok: boolean; error?: string }>({
    type: 'UNREGISTER_SERVICE_WORKER_SCOPE',
    tabId: props.tabId,
    scope,
  })
  if (!r.ok) window.alert(r.error ?? 'Unregister failed')
  await load()
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
        <span class="text-[10px] text-neutral-500">{{ loading ? 'Loading…' : `${registrations.length} registration(s)` }}</span>
        <button
          type="button"
          class="text-[11px] font-medium text-orange-700 hover:underline dark:text-orange-400"
          @click="load"
        >
          Refresh
        </button>
      </div>
      <p v-if="err" class="text-[11px] text-red-600">{{ err }}</p>
      <div class="max-h-40 overflow-auto rounded-card border border-neutral-200 dark:border-neutral-800">
        <table class="w-full border-collapse text-left text-[10px]">
          <thead class="sticky top-0 bg-neutral-100 dark:bg-neutral-900">
            <tr>
              <th class="px-2 py-1 font-medium text-neutral-600 dark:text-neutral-400">
                Scope
              </th>
              <th class="px-2 py-1 font-medium text-neutral-600 dark:text-neutral-400">
                State
              </th>
              <th class="w-16 px-1 py-1" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(r, i) in registrations"
              :key="`${r.scope}-${i}`"
              class="border-t border-neutral-100 dark:border-neutral-800"
            >
              <td class="max-w-[140px] truncate px-2 py-1 font-mono text-[9px]" :title="r.scope">
                {{ r.scope }}
              </td>
              <td class="truncate px-2 py-1 text-neutral-600" :title="r.scriptURL">
                {{ r.state }}
              </td>
              <td class="px-1 py-1">
                <button
                  type="button"
                  class="rounded px-1.5 py-0.5 text-[10px] text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  @click="unregister(r.scope)"
                >
                  Drop
                </button>
              </td>
            </tr>
            <tr v-if="!loading && registrations.length === 0">
              <td colspan="3" class="px-2 py-4 text-center text-neutral-500">
                No service worker registrations
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-[10px] text-neutral-500 dark:text-neutral-400">
        Top-frame registrations only. Script URL shown in tooltip via scope hover when needed.
      </p>
    </template>
  </div>
</template>
