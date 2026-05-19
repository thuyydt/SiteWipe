<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { CookieUpsertPayload, InspectCookie, CookieSameSite } from '@/lib/schema'

const props = defineProps<{
  open: boolean
  mode: 'create' | 'edit'
  pageUrl: string
  initialCookie?: InspectCookie | null
}>()

const emit = defineEmits<{
  close: []
  save: [CookieUpsertPayload]
}>()

function defaults(): CookieUpsertPayload {
  try {
    const u = new URL(props.pageUrl)
    return {
      name: '',
      value: '',
      domain: u.hostname,
      path: '/',
      secure: u.protocol === 'https:',
      httpOnly: false,
      sameSite: 'lax',
      session: true,
      expirationDate: undefined,
      storeId: undefined,
      partitionKey: undefined,
    }
  } catch {
    return {
      name: '',
      value: '',
      domain: '',
      path: '/',
      secure: true,
      httpOnly: false,
      sameSite: 'lax',
      session: true,
    }
  }
}

function fromInspect(c: InspectCookie): CookieUpsertPayload {
  return {
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path || '/',
    secure: c.secure,
    httpOnly: c.httpOnly,
    sameSite:
      c.sameSite === 'unspecified' || c.sameSite == null ? undefined : c.sameSite,
    session: !!c.session,
    expirationDate: c.expirationDate,
    storeId: c.storeId,
    partitionKey: c.partitionKey,
  }
}

const form = reactive<CookieUpsertPayload>(defaults())

watch(
  () => props.open,
  (open) => {
    if (!open) return
    if (props.mode === 'edit' && props.initialCookie) {
      Object.assign(form, fromInspect(props.initialCookie))
    } else {
      Object.assign(form, defaults())
    }
  },
)

const expLocal = computed({
  get() {
    if (!form.expirationDate || form.session) return ''
    const d = new Date(form.expirationDate * 1000)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  },
  set(v: string) {
    if (!v) {
      form.expirationDate = undefined
      return
    }
    const t = Date.parse(v)
    if (!Number.isNaN(t)) form.expirationDate = Math.floor(t / 1000)
  },
})

watch(
  () => form.session,
  (sess) => {
    if (sess) form.expirationDate = undefined
  },
)

function submit() {
  if (!form.name.trim()) return
  emit('save', { ...form })
}

const partitionNote = computed(() =>
  form.partitionKey ? JSON.stringify(form.partitionKey, null, 2) : '',
)

const sameSiteModel = computed({
  get() {
    const v = form.sameSite
    if (v == null || v === 'unspecified') return ''
    return v
  },
  set(raw: string) {
    form.sameSite =
      raw === ''
        ? undefined
        : (raw as CookieSameSite)
  },
})

function onBackdropKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-3 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      @keydown="onBackdropKeydown"
    >
      <div
        class="max-h-[85vh] w-full max-w-sm overflow-auto rounded-card border border-neutral-200 bg-white p-3 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
        @click.stop
      >
        <div class="mb-2 flex items-center justify-between gap-2">
          <h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            {{ mode === 'create' ? 'Add cookie' : 'Edit cookie' }}
          </h3>
          <button
            type="button"
            class="text-[11px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            @click="emit('close')"
          >
            Esc
          </button>
        </div>

        <div class="flex flex-col gap-2 text-[11px]">
          <label class="flex flex-col gap-0.5">
            <span class="text-neutral-600 dark:text-neutral-400">Name</span>
            <input
              v-model="form.name"
              type="text"
              class="rounded-md border border-neutral-200 px-2 py-1 font-mono dark:border-neutral-700 dark:bg-neutral-950"
              autocomplete="off"
            />
          </label>
          <label class="flex flex-col gap-0.5">
            <span class="text-neutral-600 dark:text-neutral-400">Value</span>
            <textarea
              v-model="form.value"
              rows="3"
              class="resize-y rounded-md border border-neutral-200 px-2 py-1 font-mono dark:border-neutral-700 dark:bg-neutral-950"
            />
          </label>
          <label class="flex flex-col gap-0.5">
            <span class="text-neutral-600 dark:text-neutral-400">Domain</span>
            <input
              v-model="form.domain"
              type="text"
              class="rounded-md border border-neutral-200 px-2 py-1 font-mono dark:border-neutral-700 dark:bg-neutral-950"
            />
          </label>
          <label class="flex flex-col gap-0.5">
            <span class="text-neutral-600 dark:text-neutral-400">Path</span>
            <input
              v-model="form.path"
              type="text"
              class="rounded-md border border-neutral-200 px-2 py-1 font-mono dark:border-neutral-700 dark:bg-neutral-950"
            />
          </label>

          <div class="flex flex-wrap gap-3">
            <label class="flex items-center gap-1">
              <input v-model="form.secure" type="checkbox" class="rounded" />
              Secure
            </label>
            <label class="flex items-center gap-1">
              <input v-model="form.httpOnly" type="checkbox" class="rounded" />
              HttpOnly
            </label>
            <label class="flex items-center gap-1">
              <input v-model="form.session" type="checkbox" class="rounded" />
              Session
            </label>
          </div>

          <label class="flex flex-col gap-0.5">
            <span class="text-neutral-600 dark:text-neutral-400">SameSite</span>
            <select
              v-model="sameSiteModel"
              class="rounded-md border border-neutral-200 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-950"
            >
              <option value="">Default</option>
              <option value="no_restriction">no_restriction</option>
              <option value="lax">lax</option>
              <option value="strict">strict</option>
            </select>
          </label>

          <label v-if="!form.session" class="flex flex-col gap-0.5">
            <span class="text-neutral-600 dark:text-neutral-400">Expires</span>
            <input
              v-model="expLocal"
              type="datetime-local"
              class="rounded-md border border-neutral-200 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-950"
            />
          </label>

          <div v-if="form.storeId" class="rounded-md bg-neutral-100 px-2 py-1 font-mono text-[10px] dark:bg-neutral-800">
            storeId: {{ form.storeId }}
          </div>
          <div
            v-if="partitionNote"
            class="rounded-md bg-neutral-100 px-2 py-1 font-mono text-[10px] dark:bg-neutral-800"
          >
            partitionKey (read-only)<br />
            {{ partitionNote }}
          </div>

          <div class="mt-2 flex justify-end gap-2 border-t border-neutral-100 pt-2 dark:border-neutral-800">
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-[11px] text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              @click="emit('close')"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-md bg-orange-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-orange-700"
              @click="submit"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
