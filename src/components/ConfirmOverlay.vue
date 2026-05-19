<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    domain?: string
    title?: string
    detail?: string
    confirmLabel?: string
  }>(),
  {
    domain: '',
    title: 'Confirm purge',
    detail: '',
    confirmLabel: 'Confirm & clear',
  },
)

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function onKey(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Enter') {
    e.preventDefault()
    emit('confirm')
  }
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('cancel')
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div
        class="w-full max-w-sm rounded-card border border-neutral-200 bg-white p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
        @click.stop
      >
        <h2 id="confirm-title" class="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          {{ title }}
        </h2>
        <p class="mt-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
          <template v-if="detail">
            {{ detail }}
          </template>
          <template v-else>
            Clear selected data for
            <span class="font-mono text-neutral-800 dark:text-neutral-200">{{ domain }}</span
            >? This cannot be undone.
          </template>
        </p>
        <p class="mt-2 text-[11px] text-neutral-500 dark:text-neutral-500">
          Press Enter to confirm or Esc to cancel.
        </p>
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            @click="emit('cancel')"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700"
            @click="emit('confirm')"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
