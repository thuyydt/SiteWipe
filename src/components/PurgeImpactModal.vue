<script setup lang="ts">
import type { PurgeImpact } from '@/lib/schema'

defineProps<{
  open: boolean
  impact: PurgeImpact | null
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && impact"
      class="fixed inset-0 z-[55] flex items-center justify-center bg-black/35 px-3 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="w-full max-w-sm rounded-card border border-neutral-200 bg-white p-4 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
        @click.stop
      >
        <h2 class="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Purge impact</h2>
        <p class="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
          Origin
          <span class="font-mono text-neutral-800 dark:text-neutral-200">{{ impact.origin }}</span>
        </p>
        <ul class="mt-3 space-y-1.5 text-[11px] text-neutral-700 dark:text-neutral-300">
          <li v-if="impact.dataTypes.length">
            <span class="font-medium">Targets:</span>
            {{ impact.dataTypes.join(', ') }}
          </li>
          <li v-if="impact.cookieCount > 0">
            <span class="font-medium">Cookies affected:</span>
            ~{{ impact.cookieCount }}
            <template v-if="impact.whitelistCookies > 0">
              (keeping {{ impact.whitelistCookies }} by name)
            </template>
          </li>
          <li v-if="impact.localStorageKeys > 0">
            <span class="font-medium">localStorage keys removed:</span>
            ~{{ impact.localStorageKeys }}
            <template v-if="impact.whitelistLocalStorage > 0">
              (restoring {{ impact.whitelistLocalStorage }} after wipe)
            </template>
          </li>
          <li v-if="impact.sessionStorageKeys > 0">
            <span class="font-medium">sessionStorage keys cleared:</span>
            ~{{ impact.sessionStorageKeys }}
          </li>
        </ul>
        <p
          v-if="impact.mayAffectLogin"
          class="mt-3 rounded-md bg-amber-50 px-2 py-2 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
        >
          This clear may log you out or reset app state. Double-check whitelists and presets.
        </p>
        <p class="mt-2 text-[10px] text-neutral-500">Press Esc to go back. Nothing is deleted until you confirm.</p>
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            @click="emit('cancel')"
          >
            Back
          </button>
          <button
            type="button"
            class="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700"
            @click="emit('confirm')"
          >
            Proceed to clear
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
