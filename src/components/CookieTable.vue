<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CookieRemovePayload, CookieUpsertPayload, InspectCookie } from '@/lib/schema'
import { ellipsisPreview } from '@/lib/format'
import CookieEditorModal from '@/components/CookieEditorModal.vue'
import { sendExtensionMessage } from '@/composables/useMessaging'
import { Pencil, Plus, Trash2 } from 'lucide-vue-next'

const ROW_CAP = 25
const VALUE_PREVIEW = 56

const props = defineProps<{
  cookies: InspectCookie[]
  tabId: number | null
  pageUrl: string
  restricted: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()

const search = ref('')
const showAll = ref(false)

const modalOpen = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const editingCookie = ref<InspectCookie | null>(null)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return props.cookies
  return props.cookies.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.domain.toLowerCase().includes(q) ||
      c.path.toLowerCase().includes(q),
  )
})

const visible = computed(() => {
  const q = search.value.trim()
  const list = filtered.value
  if (q || showAll.value) return list
  return list.slice(0, ROW_CAP)
})

const hiddenCount = computed(() => {
  const q = search.value.trim()
  if (q || showAll.value) return 0
  const n = filtered.value.length
  return n > ROW_CAP ? n - ROW_CAP : 0
})

function flags(c: InspectCookie): string {
  const parts: string[] = []
  if (c.secure) parts.push('Sec')
  if (c.httpOnly) parts.push('Http')
  if (c.session) parts.push('Session')
  else if (c.expirationDate)
    parts.push(new Date(c.expirationDate * 1000).toLocaleDateString())
  if (c.sameSite && c.sameSite !== 'unspecified') parts.push(String(c.sameSite))
  if (c.partitionKey?.topLevelSite) parts.push('Partitioned')
  return parts.join(' · ') || '—'
}

function previewVal(v: string): string {
  return ellipsisPreview(v, VALUE_PREVIEW)
}

function rowKey(c: InspectCookie, i: number): string {
  return `${c.name}|${c.domain}|${c.path}|${c.partitionKey?.topLevelSite ?? ''}|${i}`
}

function openCreate() {
  modalMode.value = 'create'
  editingCookie.value = null
  modalOpen.value = true
}

function openEdit(c: InspectCookie) {
  modalMode.value = 'edit'
  editingCookie.value = c
  modalOpen.value = true
}

async function onModalSave(payload: CookieUpsertPayload) {
  if (props.tabId == null || !props.pageUrl) return
  const r = await sendExtensionMessage<{ ok: boolean; error?: string }>({
    type: 'COOKIE_UPSERT',
    tabId: props.tabId,
    pageUrl: props.pageUrl,
    cookie: payload,
  })
  if (!r.ok) {
    window.alert(r.error ?? 'Could not save cookie')
    return
  }
  modalOpen.value = false
  emit('refresh')
}

function removeCookie(c: InspectCookie) {
  if (!confirm(`Delete cookie "${c.name}" for ${c.domain}${c.path}?`)) return
  void doRemove(c)
}

async function doRemove(c: InspectCookie) {
  if (props.tabId == null || !props.pageUrl) return
  const remove: CookieRemovePayload = {
    name: c.name,
    domain: c.domain,
    path: c.path || '/',
    secure: c.secure,
    storeId: c.storeId,
    partitionKey: c.partitionKey,
  }
  const r = await sendExtensionMessage<{ ok: boolean; error?: string }>({
    type: 'COOKIE_REMOVE',
    tabId: props.tabId,
    pageUrl: props.pageUrl,
    remove,
  })
  if (!r.ok) {
    window.alert(r.error ?? 'Could not remove cookie')
    return
  }
  emit('refresh')
}
</script>

<template>
  <div class="flex flex-col gap-2 pt-1">
    <CookieEditorModal
      :open="modalOpen"
      :mode="modalMode"
      :page-url="pageUrl"
      :initial-cookie="editingCookie"
      @close="modalOpen = false"
      @save="onModalSave"
    />

    <div class="flex items-center justify-between gap-2">
      <span class="text-[10px] text-neutral-500">{{ cookies.length }} cookies</span>
      <button
        type="button"
        class="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-[11px] font-medium hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
        :disabled="restricted || tabId == null || !pageUrl"
        @click="openCreate"
      >
        <Plus class="size-3.5" :stroke-width="1.75" />
        Add
      </button>
    </div>
    <input
      v-model="search"
      type="search"
      placeholder="Search name / domain / path…"
      class="w-full rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs outline-none ring-orange-500/30 focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900"
      @input="showAll = false"
    />
    <div
      class="max-h-44 overflow-auto rounded-card border border-neutral-200 dark:border-neutral-800"
    >
      <table class="w-full border-collapse text-left text-[10px]">
        <thead class="sticky top-0 bg-neutral-100 dark:bg-neutral-900">
          <tr>
            <th class="px-2 py-1 font-medium text-neutral-600 dark:text-neutral-400">
              Name
            </th>
            <th class="px-2 py-1 font-medium text-neutral-600 dark:text-neutral-400">
              Domain / path
            </th>
            <th class="px-2 py-1 font-medium text-neutral-600 dark:text-neutral-400">
              Value
            </th>
            <th class="px-2 py-1 font-medium text-neutral-600 dark:text-neutral-400">
              Flags
            </th>
            <th class="w-14 px-1 py-1 font-medium text-neutral-600 dark:text-neutral-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(c, i) in visible"
            :key="rowKey(c, i)"
            class="border-t border-neutral-100 dark:border-neutral-800"
          >
            <td class="max-w-[72px] truncate px-2 py-1 font-mono" :title="c.name">
              {{ c.name }}
            </td>
            <td class="max-w-[88px] truncate px-2 py-1 font-mono text-neutral-600 dark:text-neutral-400" :title="`${c.domain}${c.path}`">
              {{ c.domain }}{{ c.path }}
            </td>
            <td class="max-w-[100px] truncate px-2 py-1 font-mono" :title="c.value">
              {{ previewVal(c.value) }}
            </td>
            <td class="max-w-[72px] truncate px-2 py-1 text-neutral-500" :title="flags(c)">
              {{ flags(c) }}
            </td>
            <td class="px-1 py-1">
              <div class="flex items-center gap-0.5">
                <button
                  type="button"
                  class="rounded p-1 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  title="Edit"
                  @click="openEdit(c)"
                >
                  <Pencil class="size-3.5" :stroke-width="1.75" />
                </button>
                <button
                  type="button"
                  class="rounded p-1 text-neutral-600 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                  title="Delete"
                  @click="removeCookie(c)"
                >
                  <Trash2 class="size-3.5" :stroke-width="1.75" />
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="visible.length === 0">
            <td colspan="5" class="px-2 py-6 text-center text-neutral-500">
              No cookies for this URL scope
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
      Show all {{ filtered.length }} cookies
    </button>
    <p class="text-[10px] leading-snug text-neutral-500 dark:text-neutral-400">
      Edit/delete uses the cookies API. Partitioned cookies keep partition metadata when editing.
      Conflicting domain/path combinations may be rejected by the browser.
    </p>
  </div>
</template>
