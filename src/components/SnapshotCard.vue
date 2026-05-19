<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SnapshotRecord } from '@/lib/schema'
import { approximatePayloadBytes, formatBytes, formatRelativeTime } from '@/lib/format'
import { Download, RotateCcw, Trash2, Copy } from 'lucide-vue-next'

const props = defineProps<{
  snapshot: SnapshotRecord
}>()

const emit = defineEmits<{
  rename: [id: string, name: string]
  restore: [SnapshotRecord]
  remove: [string]
  exportJson: [SnapshotRecord]
  copyB64: [SnapshotRecord]
}>()

const nameDraft = ref(props.snapshot.name)

watch(
  () => props.snapshot.name,
  (n) => {
    nameDraft.value = n
  },
)

function commitName() {
  emit('rename', props.snapshot.id, nameDraft.value.trim() || props.snapshot.name)
}

const sizeLabel = computed(() =>
  formatBytes(approximatePayloadBytes(props.snapshot.data)),
)

const tsMs = computed(() => props.snapshot.timestamp * 1000)
</script>

<template>
  <article
    class="rounded-card border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
  >
    <input
      v-model="nameDraft"
      type="text"
      class="mb-1 w-full border-0 bg-transparent text-sm font-medium outline-none ring-0 focus:ring-0"
      @change="commitName"
      @keydown.enter.prevent="commitName"
    />
    <p class="text-[11px] text-neutral-500 dark:text-neutral-400">
      {{ formatRelativeTime(tsMs) }} · {{ sizeLabel }}
    </p>
    <footer class="mt-3 flex items-center justify-end gap-1 border-t border-neutral-100 pt-2 dark:border-neutral-800">
      <button
        type="button"
        class="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
        title="Restore"
        @click="emit('restore', snapshot)"
      >
        <RotateCcw class="size-4" stroke-width="1.75" />
      </button>
      <button
        type="button"
        class="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
        title="Export JSON"
        @click="emit('exportJson', snapshot)"
      >
        <Download class="size-4" stroke-width="1.75" />
      </button>
      <button
        type="button"
        class="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
        title="Copy snapshot string (Base64)"
        @click="emit('copyB64', snapshot)"
      >
        <Copy class="size-4" stroke-width="1.75" />
      </button>
      <button
        type="button"
        class="rounded-md p-1.5 text-neutral-600 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
        title="Delete"
        @click="emit('remove', snapshot.id)"
      >
        <Trash2 class="size-4" stroke-width="1.75" />
      </button>
    </footer>
  </article>
</template>
