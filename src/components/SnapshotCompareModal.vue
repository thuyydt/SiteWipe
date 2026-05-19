<script setup lang="ts">
import type { SnapshotCompareEntry } from '@/lib/schema'

defineProps<{
  open: boolean
  title: string
  diff: SnapshotCompareEntry[]
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[65] flex items-center justify-center bg-black/35 px-2 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      @click.self="emit('close')"
    >
      <div
        class="max-h-[78vh] w-full max-w-md overflow-hidden rounded-card border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
        @click.stop
      >
        <div class="border-b border-neutral-100 px-3 py-2 dark:border-neutral-800">
          <h2 class="text-sm font-semibold">{{ title }}</h2>
          <p class="text-[10px] text-neutral-500">{{ diff.length }} change(s)</p>
        </div>
        <div class="max-h-[56vh] overflow-auto p-2">
          <table class="w-full text-left text-[10px]">
            <thead class="sticky top-0 bg-neutral-50 dark:bg-neutral-950">
              <tr>
                <th class="px-1 py-0.5 font-medium">Area</th>
                <th class="px-1 py-0.5 font-medium">Change</th>
                <th class="px-1 py-0.5 font-medium">Key</th>
                <th class="px-1 py-0.5 font-medium">Values</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(d, i) in diff"
                :key="i"
                class="border-t border-neutral-100 dark:border-neutral-800"
              >
                <td class="px-1 py-0.5 font-mono text-neutral-500">{{ d.area }}</td>
                <td class="px-1 py-0.5 capitalize">{{ d.change }}</td>
                <td class="max-w-[100px] truncate px-1 py-0.5 font-mono" :title="d.key">
                  {{ d.key }}
                </td>
                <td
                  class="max-w-[140px] truncate px-1 py-0.5 font-mono text-neutral-600 dark:text-neutral-300"
                  :title="`${d.left ?? '∅'} → ${d.right ?? '∅'}`"
                >
                  {{ (d.left ?? '∅').slice(0, 12) }} → {{ (d.right ?? '∅').slice(0, 12) }}
                </td>
              </tr>
              <tr v-if="diff.length === 0">
                <td colspan="4" class="py-6 text-center text-neutral-500">No differences.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex justify-end border-t border-neutral-100 px-3 py-2 dark:border-neutral-800">
          <button
            type="button"
            class="rounded-md bg-neutral-900 px-3 py-1.5 text-[11px] font-medium text-white dark:bg-orange-600"
            @click="emit('close')"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
