<script setup lang="ts">
export type TabId = 'purge' | 'inspect' | 'profiles' | 'snapshots'

defineProps<{
  modelValue: TabId
}>()

const emit = defineEmits<{
  'update:modelValue': [TabId]
}>()

const tabs: { id: TabId; label: string }[] = [
  { id: 'purge', label: 'Purge' },
  { id: 'inspect', label: 'Inspect' },
  { id: 'profiles', label: 'Profiles' },
  { id: 'snapshots', label: 'Snapshots' },
]

function select(id: TabId) {
  emit('update:modelValue', id)
}
</script>

<template>
  <nav
    class="flex gap-0.5 rounded-lg bg-neutral-200/80 p-0.5 dark:bg-neutral-800/80"
    role="tablist"
  >
    <button
      v-for="t in tabs"
      :key="t.id"
      type="button"
      role="tab"
      :aria-selected="modelValue === t.id"
      class="flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors"
      :class="
        modelValue === t.id
          ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-neutral-50'
          : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
      "
      @click="select(t.id)"
    >
      {{ t.label }}
    </button>
  </nav>
</template>
