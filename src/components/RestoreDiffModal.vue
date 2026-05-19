<script setup lang="ts">
import type { RestoreDiffEntry } from '@/lib/schema'

defineProps<{
  open: boolean
  snapshotName: string
  diff: RestoreDiffEntry[]
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 px-3 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="max-h-[70vh] w-full max-w-sm overflow-hidden rounded-card border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
        @click.stop
      >
        <div class="border-b border-neutral-100 px-3 py-2 dark:border-neutral-800">
          <h2 class="text-sm font-semibold">Restore preview</h2>
          <p class="text-[11px] text-neutral-500">{{ snapshotName }}</p>
        </div>
        <div class="max-h-44 overflow-auto p-2">
          <table class="w-full text-left text-[10px]">
            <thead class="sticky top-0 bg-neutral-50 dark:bg-neutral-950">
              <tr>
                <th class="px-1 py-0.5 font-medium">Area</th>
                <th class="px-1 py-0.5 font-medium">Key</th>
                <th class="px-1 py-0.5 font-medium">Now → Saved</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, i) in diff" :key="i" class="border-t border-neutral-100 dark:border-neutral-800">
                <td class="px-1 py-0.5 font-mono text-neutral-500">{{ d.storage }}</td>
                <td class="max-w-[80px] truncate px-1 py-0.5 font-mono" :title="d.key">{{ d.key }}</td>
                <td class="max-w-[120px] truncate px-1 py-0.5 font-mono text-neutral-600 dark:text-neutral-300" :title="`${d.before ?? '∅'} → ${d.after ?? '∅'}`">
                  {{ (d.before ?? '∅').slice(0, 24) }} → {{ (d.after ?? '∅').slice(0, 24) }}
                </td>
              </tr>
              <tr v-if="diff.length === 0">
                <td colspan="3" class="px-2 py-4 text-center text-neutral-500">No storage differences.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex justify-end gap-2 border-t border-neutral-100 px-3 py-2 dark:border-neutral-800">
          <button
            type="button"
            class="rounded-md px-2 py-1 text-[11px] text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            @click="emit('cancel')"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-md bg-neutral-900 px-2 py-1 text-[11px] font-medium text-white dark:bg-orange-600"
            @click="emit('confirm')"
          >
            Restore
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
