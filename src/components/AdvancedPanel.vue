<script setup lang="ts">
import { ref } from 'vue'
import ConfirmOverlay from '@/components/ConfirmOverlay.vue'
import { sendExtensionMessage } from '@/composables/useMessaging'
import { RESTRICTED_PAGE_USER_MESSAGE } from '@/lib/extensionErrors'

const props = defineProps<{
  modelValue: boolean
  tabId: number | null
  origin: string | null
  url: string | null
  restricted: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  importB64: [string]
}>()

const killOpen = ref(false)
const paste = ref('')
const mockJson = ref('')
const err = ref<string | null>(null)
const hint = ref<string | null>(null)

function close() {
  emit('update:modelValue', false)
  err.value = null
  hint.value = null
}

async function copyMock() {
  if (props.restricted || props.tabId == null || !props.origin || !props.url) return
  err.value = null
  const r = await sendExtensionMessage<{ ok: boolean; json?: string; error?: string }>({
    type: 'COPY_MOCK_PAYLOAD',
    tabId: props.tabId,
    origin: props.origin,
    url: props.url,
  })
  if (!r.ok || !r.json) err.value = r.error ?? 'Failed'
  else {
    await navigator.clipboard.writeText(r.json)
    hint.value = 'Mock JSON copied'
    window.setTimeout(() => {
      hint.value = null
    }, 1500)
  }
}

async function copyCli() {
  if (props.restricted || props.tabId == null || !props.origin || !props.url) return
  err.value = null
  const r = await sendExtensionMessage<{ ok: boolean; script?: string; error?: string }>({
    type: 'COPY_CLI_SCRIPT',
    tabId: props.tabId,
    origin: props.origin,
    url: props.url,
  })
  if (!r.ok || !r.script) err.value = r.error ?? 'Failed'
  else {
    await navigator.clipboard.writeText(r.script)
    hint.value = 'CLI script copied'
    window.setTimeout(() => {
      hint.value = null
    }, 1500)
  }
}

function requestKill() {
  killOpen.value = true
}

async function confirmKill() {
  killOpen.value = false
  if (props.restricted || props.tabId == null || !props.origin || !props.url) return
  err.value = null
  const r = await sendExtensionMessage<{ ok: boolean; error?: string }>({
    type: 'KILL_AND_RELOAD',
    tabId: props.tabId,
    origin: props.origin,
    url: props.url,
  })
  if (!r.ok) err.value = r.error ?? 'Kill failed'
  close()
}

async function applyMockJson() {
  if (props.restricted || props.tabId == null || !props.url) return
  err.value = null
  let parsed: unknown
  try {
    parsed = JSON.parse(mockJson.value)
  } catch {
    err.value = 'Invalid JSON'
    return
  }
  if (parsed == null || typeof parsed !== 'object') {
    err.value = 'Expected an object'
    return
  }
  const r = await sendExtensionMessage<{ ok: boolean; error?: string }>({
    type: 'APPLY_ENV_PAYLOAD',
    tabId: props.tabId,
    url: props.url,
    payload: parsed as import('@/lib/schema').EnvPayload,
  })
  if (!r.ok) err.value = r.error ?? 'Apply failed'
  else {
    hint.value = 'Environment applied — tab reloading'
    mockJson.value = ''
    window.setTimeout(() => {
      hint.value = null
    }, 2000)
  }
}

function applyImport() {
  err.value = null
  emit('importB64', paste.value)
  paste.value = ''
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[45] flex justify-end bg-black/25 backdrop-blur-[1px]"
      @click.self="close"
    >
      <aside
        class="flex h-full w-[min(100%,340px)] flex-col border-l border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950"
        @click.stop
      >
        <header class="flex items-center justify-between border-b border-neutral-100 px-3 py-2 dark:border-neutral-800">
          <span class="text-xs font-semibold">Advanced</span>
          <button
            type="button"
            class="rounded px-2 py-1 text-[11px] text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900"
            @click="close"
          >
            Close
          </button>
        </header>

        <div class="flex flex-1 flex-col gap-3 overflow-auto p-3">
          <p v-if="restricted" class="text-[11px] text-amber-800 dark:text-amber-200">
            {{ RESTRICTED_PAGE_USER_MESSAGE }}
          </p>
          <p v-if="err" class="text-[11px] text-red-600">{{ err }}</p>
          <p v-if="hint" class="text-[11px] text-emerald-700 dark:text-emerald-400">{{ hint }}</p>

          <button
            type="button"
            class="w-full rounded-lg border border-neutral-200 py-2 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
            :disabled="restricted || tabId == null"
            @click="copyMock"
          >
            Copy as Mock JSON
          </button>
          <button
            type="button"
            class="w-full rounded-lg border border-neutral-200 py-2 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
            :disabled="restricted || tabId == null"
            @click="copyCli"
          >
            Copy as CLI script
          </button>
          <button
            type="button"
            class="w-full rounded-lg bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-40"
            :disabled="restricted || tabId == null"
            @click="requestKill"
          >
            Kill &amp; Reload
          </button>

          <div class="rounded-card border border-neutral-200 p-2 dark:border-neutral-800">
            <p class="mb-1 text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
              Inject environment (Mock JSON)
            </p>
            <p class="mb-2 text-[10px] text-neutral-500">
              Same shape as “Copy as Mock JSON” — replaces cookies + storages for this origin, then reloads.
            </p>
            <textarea
              v-model="mockJson"
              rows="5"
              placeholder="{ &quot;origin&quot;: &quot;https://…&quot;, &quot;localStorage&quot;: { … }, … }"
              class="mb-2 w-full resize-none rounded-md border border-neutral-200 bg-white p-2 font-mono text-[10px] dark:border-neutral-700 dark:bg-neutral-900"
            />
            <button
              type="button"
              class="w-full rounded-md bg-orange-600 py-1.5 text-[11px] font-medium text-white hover:bg-orange-700 disabled:opacity-40"
              :disabled="restricted || tabId == null || !mockJson.trim()"
              @click="applyMockJson"
            >
              Apply to this tab
            </button>
          </div>

          <div class="rounded-card border border-neutral-200 p-2 dark:border-neutral-800">
            <p class="mb-1 text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
              Import snapshot string (Base64)
            </p>
            <textarea
              v-model="paste"
              rows="4"
              placeholder="Paste Base64…"
              class="mb-2 w-full resize-none rounded-md border border-neutral-200 bg-white p-2 font-mono text-[10px] dark:border-neutral-700 dark:bg-neutral-900"
            />
            <button
              type="button"
              class="w-full rounded-md bg-neutral-900 py-1.5 text-[11px] font-medium text-white dark:bg-orange-600"
              @click="applyImport"
            >
              Import snapshot
            </button>
          </div>
        </div>
      </aside>
    </div>

    <ConfirmOverlay
      :open="killOpen"
      title="Kill &amp; Reload"
      detail="Clears cookies, storages, IndexedDB, caches, service workers for this origin, then hard-reloads the tab. This cannot be undone."
      confirm-label="Kill &amp; reload"
      @confirm="confirmKill"
      @cancel="killOpen = false"
    />
  </Teleport>
</template>
