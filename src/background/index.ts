import browser from '@/extension/browser'
import { dispatchMessage } from '@/background/messaging'
import {
  autoCapture,
  cookieOriginsForChange,
  scheduleCookieAutoCapture,
} from '@/background/autoSnapshot'
import { readAutoWatchOrigins } from '@/background/handlers/storagePersistence'
import type { ExtensionRequest } from '@/lib/schema'
import { isRestrictedUrl, originFromUrl } from '@/lib/permissions'

interface AutoTickMessage {
  type: 'AUTO_SNAPSHOT_TICK'
}

function isAutoTick(msg: unknown): msg is AutoTickMessage {
  return (
    msg != null &&
    typeof msg === 'object' &&
    'type' in msg &&
    (msg as AutoTickMessage).type === 'AUTO_SNAPSHOT_TICK'
  )
}

browser.runtime.onMessage.addListener(
  (message: unknown, sender, sendResponse: (r: unknown) => void) => {
    if (isAutoTick(message)) {
      void (async () => {
        const tabId = sender.tab?.id
        const url = sender.tab?.url
        if (tabId == null || !url || isRestrictedUrl(url)) {
          sendResponse({ ok: false })
          return
        }
        const origin = originFromUrl(url)
        if (!origin) {
          sendResponse({ ok: false })
          return
        }
        const watched = await readAutoWatchOrigins()
        if (!watched.includes(origin)) {
          sendResponse({ ok: true, skipped: true })
          return
        }
        const ok = await autoCapture({ origin, source: 'storage', preferTabId: tabId })
        sendResponse({ ok, skipped: !ok })
      })()
      return true
    }

    void dispatchMessage(message as ExtensionRequest).then(sendResponse)
    return true
  },
)

browser.cookies.onChanged.addListener(async ({ cookie }) => {
  try {
    const watched = await readAutoWatchOrigins()
    if (watched.length === 0) return
    const origins = cookieOriginsForChange(cookie, watched)
    for (const o of origins) {
      void scheduleCookieAutoCapture(o)
    }
  } catch {
    /* storage unavailable */
  }
})
