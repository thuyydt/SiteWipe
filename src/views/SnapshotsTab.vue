<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { RestoreDiffEntry, SnapshotCompareEntry, SnapshotRecord } from '@/lib/schema'
import SnapshotCard from '@/components/SnapshotCard.vue'
import ConfirmOverlay from '@/components/ConfirmOverlay.vue'
import RestoreDiffModal from '@/components/RestoreDiffModal.vue'
import SnapshotCompareModal from '@/components/SnapshotCompareModal.vue'
import { sendExtensionMessage } from '@/composables/useMessaging'
import { RESTRICTED_PAGE_USER_MESSAGE } from '@/lib/extensionErrors'
import { loadSnapshots, persistSnapshots } from '@/composables/useSnapshots'
import { fromBase64Utf8, toBase64Utf8 } from '@/lib/format'

const props = defineProps<{
  tabId: number | null
  origin: string | null
  url: string | null
  restricted: boolean
}>()

const snapshots = ref<SnapshotRecord[]>([])
const loading = ref(false)
const err = ref<string | null>(null)
const captureName = ref('')
const working = ref(false)

const toast = ref<{ show: boolean; msg: string }>({ show: false, msg: '' })

const diffOpen = ref(false)
const diffEntries = ref<RestoreDiffEntry[]>([])
const pendingRestore = ref<SnapshotRecord | null>(null)

const watchOrigins = ref<string[]>([])
const compareLeftId = ref('')
const compareRightId = ref('')
const compareOpen = ref(false)
const compareDiff = ref<SnapshotCompareEntry[]>([])
const compareTitle = ref('')
const clearAllOpen = ref(false)

const filtered = computed(() =>
  snapshots.value.filter((s) => (props.origin ? s.origin === props.origin : true)),
)

watch(filtered, (list) => {
  if (list.length === 0) {
    compareLeftId.value = ''
    compareRightId.value = ''
    return
  }
  if (!compareLeftId.value || !list.some((s) => s.id === compareLeftId.value)) {
    compareLeftId.value = list[0]?.id ?? ''
  }
  if (!compareRightId.value || !list.some((s) => s.id === compareRightId.value)) {
    compareRightId.value = list.length > 1 ? list[1]!.id : list[0]!.id
  }
})

const autoWatchOn = computed(
  () => props.origin != null && watchOrigins.value.includes(props.origin),
)

async function refreshList() {
  loading.value = true
  err.value = null
  try {
    snapshots.value = await loadSnapshots()
    snapshots.value.sort((a, b) => b.timestamp - a.timestamp)
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

async function loadWatch() {
  try {
    const r = await sendExtensionMessage<{ ok: boolean; origins?: string[] }>({
      type: 'GET_AUTO_WATCH_ORIGINS',
    })
    if (r.ok && r.origins) watchOrigins.value = r.origins
  } catch {
    /* ignore */
  }
}

async function toggleAutoWatch() {
  if (!props.origin) return
  const next = autoWatchOn.value
    ? watchOrigins.value.filter((o) => o !== props.origin)
    : [...watchOrigins.value, props.origin]
  watchOrigins.value = next
  await sendExtensionMessage({ type: 'SET_AUTO_WATCH_ORIGINS', origins: next })
}

async function capture() {
  if (props.restricted || props.tabId == null || !props.origin || !props.url) return
  working.value = true
  err.value = null
  try {
    const r = await sendExtensionMessage<{ ok: boolean; snapshot?: SnapshotRecord; error?: string }>(
      {
        type: 'CAPTURE_SNAPSHOT',
        tabId: props.tabId,
        origin: props.origin,
        url: props.url,
        name: captureName.value.trim() || undefined,
      },
    )
    if (!r.ok || !r.snapshot) err.value = r.error ?? 'Capture failed'
    else {
      snapshots.value = [r.snapshot, ...snapshots.value.filter((s) => s.id !== r.snapshot!.id)]
      await persistSnapshots(snapshots.value)
      captureName.value = ''
    }
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  } finally {
    working.value = false
  }
}

function showToast(msg: string) {
  toast.value = { show: true, msg }
  window.setTimeout(() => {
    toast.value.show = false
  }, 2200)
}

async function requestRestore(snap: SnapshotRecord) {
  if (props.tabId == null) return
  pendingRestore.value = snap
  const r = await sendExtensionMessage<{ ok: boolean; diff?: RestoreDiffEntry[]; error?: string }>(
    {
      type: 'GET_RESTORE_DIFF',
      tabId: props.tabId,
      snapshot: snap,
    },
  )
  if (!r.ok) {
    err.value = r.error ?? 'Diff failed'
    pendingRestore.value = null
    return
  }
  diffEntries.value = r.diff ?? []
  diffOpen.value = true
}

async function confirmRestore() {
  diffOpen.value = false
  const snap = pendingRestore.value
  pendingRestore.value = null
  if (!snap || props.tabId == null) return
  working.value = true
  try {
    const r = await sendExtensionMessage<{ ok: boolean; error?: string }>({
      type: 'RESTORE_SNAPSHOT',
      tabId: props.tabId,
      snapshot: snap,
    })
    if (!r.ok) err.value = r.error ?? 'Restore failed'
    else showToast('Site state restored!')
  } finally {
    working.value = false
  }
}

function cancelRestore() {
  diffOpen.value = false
  pendingRestore.value = null
}

async function rename(id: string, name: string) {
  snapshots.value = snapshots.value.map((s) => (s.id === id ? { ...s, name } : s))
  await persistSnapshots(snapshots.value)
}

async function remove(id: string) {
  snapshots.value = snapshots.value.filter((s) => s.id !== id)
  await persistSnapshots(snapshots.value)
}

async function confirmClearAllSnapshots() {
  clearAllOpen.value = false
  snapshots.value = []
  await persistSnapshots([])
  showToast('All snapshots removed.')
}

function exportJson(snap: SnapshotRecord) {
  const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sitewipe-snapshot-${snap.id.slice(0, 8)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

async function copyB64(snap: SnapshotRecord) {
  const payload = toBase64Utf8(JSON.stringify(snap))
  await navigator.clipboard.writeText(payload)
  showToast('Snapshot string copied')
}

async function importSnapshotB64(b64: string) {
  try {
    const json = fromBase64Utf8(b64)
    const parsed = JSON.parse(json) as SnapshotRecord
    if (!parsed.id || !parsed.origin || !parsed.data) throw new Error('Invalid snapshot')
    const merged = [...snapshots.value.filter((s) => s.id !== parsed.id), parsed]
    snapshots.value = merged
    await persistSnapshots(merged)
    showToast('Snapshot imported')
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e)
  }
}

function snapById(id: string): SnapshotRecord | undefined {
  return snapshots.value.find((s) => s.id === id)
}

async function runCompareSnapshots() {
  const left = snapById(compareLeftId.value)
  const right = snapById(compareRightId.value)
  if (!left || !right) {
    err.value = 'Pick two snapshots'
    return
  }
  const r = await sendExtensionMessage<{
    ok: boolean
    diff?: SnapshotCompareEntry[]
    error?: string
  }>({
    type: 'COMPARE_SNAPSHOT_DATA',
    left,
    right,
  })
  if (!r.ok) {
    err.value = r.error ?? 'Compare failed'
    return
  }
  compareTitle.value = `${left.name} ↔ ${right.name}`
  compareDiff.value = r.diff ?? []
  compareOpen.value = true
}

async function compareSnapshotToLive() {
  const left = snapById(compareLeftId.value)
  if (!left || props.tabId == null || !props.url) {
    err.value = 'Need an active tab and a snapshot'
    return
  }
  const r = await sendExtensionMessage<{
    ok: boolean
    diff?: SnapshotCompareEntry[]
    error?: string
  }>({
    type: 'GET_SNAPSHOT_VS_LIVE_DIFF',
    tabId: props.tabId,
    url: props.url,
    snapshot: left,
  })
  if (!r.ok) {
    err.value = r.error ?? 'Live diff failed'
    return
  }
  compareTitle.value = `${left.name} → Live tab`
  compareDiff.value = r.diff ?? []
  compareOpen.value = true
}

defineExpose({ refreshList, importSnapshotB64 })

onMounted(() => {
  void refreshList()
  void loadWatch()
})
</script>

<template>
  <div class="relative flex flex-col gap-3">
    <div
      v-if="toast.show"
      class="pointer-events-none fixed inset-x-0 top-10 z-[70] flex justify-center px-3"
    >
      <div
        class="rounded-full bg-neutral-900/90 px-4 py-2 text-center text-[11px] font-medium text-white shadow-lg dark:bg-white/90 dark:text-neutral-900"
      >
        {{ toast.msg }}
      </div>
    </div>

    <RestoreDiffModal
      :open="diffOpen"
      :snapshot-name="pendingRestore?.name ?? ''"
      :diff="diffEntries"
      @confirm="confirmRestore"
      @cancel="cancelRestore"
    />

    <SnapshotCompareModal
      :open="compareOpen"
      :title="compareTitle"
      :diff="compareDiff"
      @close="compareOpen = false"
    />

    <ConfirmOverlay
      :open="clearAllOpen"
      title="Clear all snapshots"
      detail="Remove every saved snapshot from this extension (all origins). This cannot be undone."
      confirm-label="Delete all"
      @confirm="confirmClearAllSnapshots"
      @cancel="clearAllOpen = false"
    />

    <div v-if="restricted" class="text-[11px] text-amber-800 dark:text-amber-200">
      {{ RESTRICTED_PAGE_USER_MESSAGE }}
    </div>

    <template v-else>
      <label
        class="flex cursor-pointer items-center gap-2 rounded-md border border-neutral-200 px-2 py-2 text-[11px] dark:border-neutral-800"
      >
        <input
          type="checkbox"
          class="rounded border-neutral-400"
          :checked="autoWatchOn"
          :disabled="origin == null"
          @change="toggleAutoWatch"
        />
        <span>
          Auto-save snapshot when
          <span class="font-medium">cookies / localStorage / sessionStorage</span>
          change (per-origin, debounced; captures a baseline when you enable it).
        </span>
      </label>

      <div
        v-if="filtered.length >= 1"
        class="rounded-card border border-neutral-200 p-2 dark:border-neutral-800"
      >
        <p class="mb-2 text-[11px] font-medium text-neutral-800 dark:text-neutral-200">Compare</p>
        <div class="mb-2 flex flex-col gap-2">
          <select
            v-model="compareLeftId"
            class="w-full rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option v-for="s in filtered" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
          <select
            v-model="compareRightId"
            class="w-full rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option v-for="s in filtered" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
        <div class="flex flex-wrap gap-1">
          <button
            type="button"
            class="rounded-md bg-neutral-900 px-2 py-1 text-[10px] font-medium text-white dark:bg-orange-600"
            :disabled="filtered.length < 2"
            @click="runCompareSnapshots"
          >
            Snapshot vs snapshot
          </button>
          <button
            type="button"
            class="rounded-md border border-neutral-200 px-2 py-1 text-[10px] font-medium dark:border-neutral-700"
            :disabled="tabId == null || !url"
            @click="compareSnapshotToLive"
          >
            Snapshot vs live
          </button>
        </div>
      </div>

      <div class="flex justify-end">
        <button
          type="button"
          class="rounded-md border border-neutral-200 px-2 py-1 text-[10px] font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
          :disabled="restricted || snapshots.length === 0"
          @click="clearAllOpen = true"
        >
          Clear all snapshots
        </button>
      </div>

      <div class="flex gap-2">
        <input
          v-model="captureName"
          type="text"
          placeholder="Name (optional)"
          class="min-w-0 flex-1 rounded-md border border-neutral-200 px-2 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="button"
          class="shrink-0 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-orange-600"
          :disabled="working || tabId == null"
          @click="capture"
        >
          + New
        </button>
      </div>

      <p v-if="err" class="text-[11px] text-red-600">{{ err }}</p>
      <p class="text-[10px] text-neutral-500">Showing snapshots for this origin when matched.</p>

      <div v-if="loading" class="text-[11px] text-neutral-500">Loading…</div>
      <div v-else class="flex max-h-80 flex-col gap-2 overflow-auto pr-0.5">
        <SnapshotCard
          v-for="s in filtered"
          :key="s.id"
          :snapshot="s"
          @rename="rename"
          @restore="requestRestore"
          @remove="remove"
          @export-json="exportJson"
          @copy-b64="copyB64"
        />
        <p v-if="filtered.length === 0" class="py-6 text-center text-[11px] text-neutral-500">
          No snapshots yet.
        </p>
      </div>
    </template>
  </div>
</template>
