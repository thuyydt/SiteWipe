<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  compactJsonMaybe,
  ellipsisPreview,
  formatJsonMaybe,
  isBooleanString,
  looksLikeJsonString,
  toggleBooleanString,
} from '@/lib/format'
import { Trash2 } from 'lucide-vue-next'

const ROW_CAP = 30
const VALUE_PREVIEW_CHARS = 72

const props = defineProps<{
  /** Which Web Storage bucket these rows belong to */
  storageKind: 'localStorage' | 'sessionStorage'
  entries: Record<string, string>
  /** Summary label shown inside `<details>` via parent — table title optional */
  sectionLabel?: string
}>()

const emit = defineEmits<{
  updateValue: [
    payload: {
      storage: 'localStorage' | 'sessionStorage'
      key: string
      value: string
    },
  ]
  deleteKey: [payload: { storage: 'localStorage' | 'sessionStorage'; key: string }]
}>()

const search = ref('')
const showAll = ref(false)
const editing = ref<{ storage: 'localStorage' | 'sessionStorage'; key: string } | null>(
  null,
)
const draft = ref('')

const rowsFiltered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const out: { storage: 'localStorage' | 'sessionStorage'; key: string; value: string }[] =
    []
  for (const [key, value] of Object.entries(props.entries)) {
    out.push({ storage: props.storageKind, key, value })
  }
  out.sort((a, b) => a.key.localeCompare(b.key))
  if (!q) return out
  return out.filter((r) => r.key.toLowerCase().includes(q))
})

const visibleRows = computed(() => {
  const list = rowsFiltered.value
  const q = search.value.trim()
  if (q || showAll.value) return list
  return list.slice(0, ROW_CAP)
})

const hiddenCount = computed(() => {
  const q = search.value.trim()
  if (q || showAll.value) return 0
  const n = rowsFiltered.value.length
  return n > ROW_CAP ? n - ROW_CAP : 0
})

watch([search, () => props.entries], () => {
  showAll.value = false
})

watch(editing, (e) => {
  if (!e) return
  const src = props.entries[e.key]
  draft.value =
    src !== undefined && looksLikeJsonString(src) ? formatJsonMaybe(src) : (src ?? '')
})

function preview(val: string): string {
  return ellipsisPreview(val, VALUE_PREVIEW_CHARS)
}

function startEdit(r: { storage: 'localStorage' | 'sessionStorage'; key: string }) {
  editing.value = r
}

function commitEdit() {
  if (!editing.value) return
  const v = draft.value
  const finalVal = looksLikeJsonString(v) ? compactJsonMaybe(v) : v
  emit('updateValue', {
    storage: editing.value.storage,
    key: editing.value.key,
    value: finalVal,
  })
  editing.value = null
}

function toggleBool(r: {
  storage: 'localStorage' | 'sessionStorage'
  key: string
  value: string
}) {
  if (!isBooleanString(r.value)) return
  emit('updateValue', {
    storage: r.storage,
    key: r.key,
    value: toggleBooleanString(r.value),
  })
}

function remove(r: { storage: 'localStorage' | 'sessionStorage'; key: string }) {
  emit('deleteKey', { storage: r.storage, key: r.key })
}

const keyCount = computed(() => Object.keys(props.entries).length)
</script>

<template>
  <div class="flex flex-col gap-2 pt-1">
    <div class="flex items-center justify-between gap-2">
      <span v-if="sectionLabel" class="text-[10px] text-neutral-500">{{ sectionLabel }}</span>
      <span class="text-[10px] text-neutral-500">{{ keyCount }} keys</span>
    </div>
    <input
      v-model="search"
      type="search"
      placeholder="Search keys…"
      class="w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs outline-none ring-orange-500/30 focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900"
    />
    <div
      class="max-h-44 overflow-auto rounded-card border border-neutral-200 dark:border-neutral-800"
    >
      <table class="w-full border-collapse text-left text-[11px]">
        <thead class="sticky top-0 bg-neutral-100 dark:bg-neutral-900">
          <tr>
            <th class="px-2 py-1 font-medium text-neutral-600 dark:text-neutral-400">Key</th>
            <th class="px-2 py-1 font-medium text-neutral-600 dark:text-neutral-400">
              Value
            </th>
            <th class="w-8 px-1 py-1" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in visibleRows"
            :key="`${r.storage}:${r.key}`"
            class="border-t border-neutral-100 dark:border-neutral-800"
          >
            <td
              class="max-w-[110px] truncate px-2 py-1 font-mono text-neutral-800 dark:text-neutral-200"
              :title="r.key"
            >
              {{ r.key }}
            </td>
            <td
              class="max-w-[160px] cursor-pointer truncate px-2 py-1 font-mono text-neutral-600 dark:text-neutral-300"
              :title="r.value"
              @click="startEdit(r)"
            >
              {{ preview(r.value) }}
            </td>
            <td class="px-1 py-1">
              <div class="flex items-center gap-0.5">
                <button
                  v-if="isBooleanString(r.value)"
                  type="button"
                  class="rounded border border-neutral-200 px-1 text-[10px] dark:border-neutral-700"
                  title="Toggle boolean"
                  @click.stop="toggleBool(r)"
                >
                  T
                </button>
                <button
                  type="button"
                  class="rounded p-1 text-neutral-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                  title="Remove key"
                  @click.stop="remove(r)"
                >
                  <Trash2 class="size-3.5" :stroke-width="1.75" />
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="visibleRows.length === 0">
            <td colspan="3" class="px-2 py-6 text-center text-neutral-500">
              No keys
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <button
      v-if="hiddenCount > 0"
      type="button"
      class="text-[11px] font-medium text-orange-700 hover:underline dark:text-orange-400"
      @click="showAll = true"
    >
      Show all {{ rowsFiltered.length }} keys
    </button>

    <div
      v-if="editing"
      class="rounded-card border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-900/60"
    >
      <div class="mb-1 flex items-center justify-between gap-2">
        <span class="text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
          Edit
          <span class="font-mono text-neutral-500">{{ editing.key }}</span>
        </span>
        <button
          type="button"
          class="text-[11px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          @click="editing = null"
        >
          Close
        </button>
      </div>
      <textarea
        v-model="draft"
        rows="6"
        class="w-full resize-y rounded-md border border-neutral-200 bg-white p-2 font-mono text-[11px] dark:border-neutral-700 dark:bg-neutral-950"
      />
      <div class="mt-2 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-md bg-neutral-900 px-2 py-1 text-[11px] font-medium text-white dark:bg-orange-600"
          @click="commitEdit"
        >
          Save
        </button>
      </div>
    </div>
  </div>
</template>
