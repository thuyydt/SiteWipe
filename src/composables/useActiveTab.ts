import { computed, ref } from 'vue'
import { sendExtensionMessage } from '@/composables/useMessaging'

export interface ActiveTabContext {
  tabId: number | null
  origin: string | null
  url: string | null
  title: string | null
  restricted: boolean
}

export function useActiveTab() {
  const ctx = ref<ActiveTabContext | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      const res = await sendExtensionMessage<{
        ok: boolean
        tabId: number | null
        origin: string | null
        url: string | null
        title: string | null
        restricted: boolean
      }>({ type: 'GET_ACTIVE_TAB_CONTEXT' })
      if (!res.ok) {
        error.value = 'Failed to read tab'
        return
      }
      ctx.value = {
        tabId: res.tabId,
        origin: res.origin,
        url: res.url,
        title: res.title,
        restricted: res.restricted,
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  const domainLabel = computed(() => {
    if (!ctx.value?.origin) return '—'
    try {
      return new URL(ctx.value.origin).hostname
    } catch {
      return ctx.value.origin
    }
  })

  return { ctx, loading, error, refresh, domainLabel }
}
