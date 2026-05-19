<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { PurgeOptions, PurgeProfile } from '@/lib/schema'
import { DEFAULT_PURGE_OPTIONS } from '@/lib/schema'
import { sendExtensionMessage } from '@/composables/useMessaging'

const props = defineProps<{
  siteHostname?: string | null
}>()

const profiles = ref<PurgeProfile[]>([])
const loading = ref(false)
const err = ref<string | null>(null)

const draftName = ref('')
const draftOpts = ref<PurgeOptions>({ ...DEFAULT_PURGE_OPTIONS })
const draftMatchHosts = ref('')
const draftCookieWl = ref('')
const draftLsWl = ref('')

async function load() {
  loading.value = true
  err.value = null
  try {
    const r = await sendExtensionMessage<{ ok: boolean; profiles?: PurgeProfile[] }>({
      type: 'LOAD_PROFILES',
    })
    profiles.value = r.ok && r.profiles ? r.profiles : []
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

async function persist() {
  await sendExtensionMessage({
    type: 'SAVE_PROFILES',
    profiles: profiles.value,
  })
}

function parseHosts(raw: string): string[] | undefined {
  const parts = raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  return parts.length ? parts : undefined
}

async function addProfile() {
  const name = draftName.value.trim() || `Preset ${profiles.value.length + 1}`
  const matchOrigins = parseHosts(draftMatchHosts.value)
  const purge: PurgeOptions = {
    ...draftOpts.value,
    whitelistCookieNames: draftCookieWl.value
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean),
    whitelistLocalStorageKeys: draftLsWl.value
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean),
  }
  const p: PurgeProfile = {
    id: crypto.randomUUID(),
    name,
    purge,
    ...(matchOrigins ? { matchOrigins } : {}),
  }
  profiles.value = [...profiles.value, p]
  draftName.value = ''
  draftMatchHosts.value = ''
  draftCookieWl.value = ''
  draftLsWl.value = ''
  draftOpts.value = { ...DEFAULT_PURGE_OPTIONS }
  await persist()
}

async function removeProfile(id: string) {
  profiles.value = profiles.value.filter((p) => p.id !== id)
  await persist()
}

const emit = defineEmits<{
  applyPreset: [PurgeOptions]
}>()

function apply(p: PurgeProfile) {
  emit('applyPreset', { ...p.purge })
}

const matching = computed(() =>
  props.siteHostname != null && props.siteHostname.length > 0
    ? profiles.value.filter((p) => p.matchOrigins?.includes(props.siteHostname!))
    : [],
)

onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-3">
    <p class="text-[11px] text-neutral-600 dark:text-neutral-400">
      Save purge presets (recipes). Applying copies options — including whitelists — into the Purge tab.
    </p>

    <div
      v-if="matching.length > 0"
      class="rounded-md bg-orange-50 px-2 py-2 text-[11px] text-orange-950 dark:bg-orange-950/40 dark:text-orange-100"
    >
      <p class="font-medium">Matches this site</p>
      <ul class="mt-1 space-y-1">
        <li v-for="m in matching" :key="m.id" class="flex items-center justify-between gap-2">
          <span class="truncate">{{ m.name }}</span>
          <button
            type="button"
            class="shrink-0 rounded px-2 py-0.5 text-[10px] font-medium text-orange-800 hover:underline dark:text-orange-200"
            @click="apply(m)"
          >
            Apply
          </button>
        </li>
      </ul>
    </div>

    <p v-if="err" class="text-[11px] text-red-600">{{ err }}</p>
    <div v-if="loading" class="text-[11px] text-neutral-500">Loading…</div>

    <ul class="max-h-36 space-y-2 overflow-auto">
      <li
        v-for="p in profiles"
        :key="p.id"
        class="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-2 py-1.5 dark:border-neutral-800"
      >
        <div class="min-w-0">
          <span class="truncate text-xs font-medium">{{ p.name }}</span>
          <p v-if="p.matchOrigins?.length" class="truncate text-[10px] text-neutral-500">
            {{ p.matchOrigins.join(', ') }}
          </p>
        </div>
        <div class="flex shrink-0 gap-1">
          <button
            type="button"
            class="rounded px-2 py-0.5 text-[11px] text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/30"
            @click="apply(p)"
          >
            Apply
          </button>
          <button
            type="button"
            class="rounded px-2 py-0.5 text-[11px] text-neutral-500 hover:text-red-600"
            @click="removeProfile(p.id)"
          >
            Delete
          </button>
        </div>
      </li>
    </ul>

    <div class="rounded-card border border-neutral-200 p-2 dark:border-neutral-800">
      <p class="mb-2 text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
        New preset
      </p>
      <input
        v-model="draftName"
        type="text"
        placeholder="Name…"
        class="mb-2 w-full rounded-md border border-neutral-200 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
      />
      <label class="mb-1 block text-[10px] text-neutral-500">Suggest on hostnames (optional)</label>
      <input
        v-model="draftMatchHosts"
        type="text"
        placeholder="app.example.com, localhost"
        class="mb-2 w-full rounded-md border border-neutral-200 px-2 py-1 font-mono text-[10px] dark:border-neutral-700 dark:bg-neutral-900"
      />
      <fieldset class="mb-2 grid grid-cols-2 gap-1 border-0 p-0">
        <label class="flex items-center gap-1 text-[10px]">
          <input v-model="draftOpts.cookies" type="checkbox" class="rounded" /> Cookies
        </label>
        <label class="flex items-center gap-1 text-[10px]">
          <input v-model="draftOpts.preserveSessionCookies" type="checkbox" class="rounded" />
          Keep session ck
        </label>
        <label class="flex items-center gap-1 text-[10px]">
          <input v-model="draftOpts.localStorage" type="checkbox" class="rounded" /> localStorage
        </label>
        <label class="flex items-center gap-1 text-[10px]">
          <input v-model="draftOpts.sessionStorage" type="checkbox" class="rounded" /> sessionStor.
        </label>
        <label class="flex items-center gap-1 text-[10px]">
          <input v-model="draftOpts.indexedDB" type="checkbox" class="rounded" /> IndexedDB
        </label>
        <label class="flex items-center gap-1 text-[10px]">
          <input v-model="draftOpts.cacheStorage" type="checkbox" class="rounded" /> Cache
        </label>
        <label class="flex items-center gap-1 text-[10px]">
          <input v-model="draftOpts.serviceWorkers" type="checkbox" class="rounded" /> SW
        </label>
      </fieldset>
      <p class="mb-1 text-[10px] text-neutral-500">Whitelist names (optional)</p>
      <input
        v-model="draftCookieWl"
        type="text"
        placeholder="Cookie names, comma-separated"
        class="mb-1 w-full rounded border border-neutral-200 px-1 py-0.5 font-mono text-[10px] dark:border-neutral-700 dark:bg-neutral-900"
      />
      <input
        v-model="draftLsWl"
        type="text"
        placeholder="localStorage keys, comma-separated"
        class="mb-2 w-full rounded border border-neutral-200 px-1 py-0.5 font-mono text-[10px] dark:border-neutral-700 dark:bg-neutral-900"
      />
      <button
        type="button"
        class="w-full rounded-md bg-neutral-900 py-1.5 text-[11px] font-medium text-white dark:bg-orange-600"
        @click="addProfile"
      >
        Save preset
      </button>
    </div>
  </div>
</template>
