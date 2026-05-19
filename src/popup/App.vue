<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import TabBar from '@/components/TabBar.vue'
import PurgeTab from '@/views/PurgeTab.vue'
import InspectTab from '@/views/InspectTab.vue'
import ProfilesTab from '@/views/ProfilesTab.vue'
import SnapshotsTab from '@/views/SnapshotsTab.vue'
import AdvancedPanel from '@/components/AdvancedPanel.vue'
import { useActiveTab } from '@/composables/useActiveTab'
import type { PurgeOptions } from '@/lib/schema'
import browser from '@/extension/browser'
import { BookOpen, PanelRightOpen } from 'lucide-vue-next'

function openUserGuide() {
  void browser.tabs.create({ url: browser.runtime.getURL('src/doc/index.html') })
}

type TabId = 'purge' | 'inspect' | 'profiles' | 'snapshots'

const tab = ref<TabId>('purge')
const advancedOpen = ref(false)

const { ctx, loading, error, refresh, domainLabel } = useActiveTab()

const purgeRef = ref<InstanceType<typeof PurgeTab> | null>(null)
const snapshotsRef = ref<InstanceType<typeof SnapshotsTab> | null>(null)

onMounted(() => {
  void refresh()
})

function applyPreset(opt: PurgeOptions) {
  const target = purgeRef.value?.opts
  if (!target) return
  Object.assign(target, opt)
  purgeRef.value?.syncDraftsFromOpts()
  tab.value = 'purge'
}

function onImportB64(s: string) {
  void snapshotsRef.value?.importSnapshotB64(s)
}

const siteHostname = computed(() => {
  const url = ctx.value?.url
  if (!url || ctx.value?.restricted) return null
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
})
</script>

<template>
  <div class="flex flex-col gap-3 p-3">
    <header class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <h1 class="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          Site Wipe
        </h1>
        <p v-if="loading" class="truncate text-[11px] text-neutral-500">Loading tab…</p>
        <p v-else-if="error" class="truncate text-[11px] text-red-600">{{ error }}</p>
        <p v-else class="truncate text-[11px] text-neutral-600 dark:text-neutral-400">
          {{ domainLabel }}
        </p>
      </div>
      <div class="flex shrink-0 gap-1.5">
        <button
          type="button"
          class="rounded-lg border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
          title="User guide"
          aria-label="User guide"
          @click="openUserGuide"
        >
          <BookOpen class="size-4" :stroke-width="1.75" />
        </button>
        <button
          type="button"
          class="rounded-lg border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
          title="Advanced"
          aria-label="Advanced panel"
          @click="advancedOpen = true"
        >
          <PanelRightOpen class="size-4" :stroke-width="1.75" />
        </button>
      </div>
    </header>

    <TabBar v-model="tab" />

    <main class="overflow-auto pb-2">
      <PurgeTab
        v-show="tab === 'purge'"
        ref="purgeRef"
        :tab-id="ctx?.tabId ?? null"
        :origin="ctx?.origin ?? null"
        :url="ctx?.url ?? null"
        :restricted="ctx?.restricted ?? true"
      />
      <InspectTab
        v-show="tab === 'inspect'"
        :tab-id="ctx?.tabId ?? null"
        :url="ctx?.url ?? null"
        :restricted="ctx?.restricted ?? true"
      />
      <ProfilesTab v-show="tab === 'profiles'" :site-hostname="siteHostname" @apply-preset="applyPreset" />
      <SnapshotsTab
        v-show="tab === 'snapshots'"
        ref="snapshotsRef"
        :tab-id="ctx?.tabId ?? null"
        :origin="ctx?.origin ?? null"
        :url="ctx?.url ?? null"
        :restricted="ctx?.restricted ?? true"
      />
    </main>

    <AdvancedPanel
      v-model="advancedOpen"
      :tab-id="ctx?.tabId ?? null"
      :origin="ctx?.origin ?? null"
      :url="ctx?.url ?? null"
      :restricted="ctx?.restricted ?? true"
      @import-b64="onImportB64"
    />
  </div>
</template>
