import browser from '@/extension/browser'
import type { ExtensionRequest } from '@/lib/schema'

export async function sendExtensionMessage<R = unknown>(
  msg: ExtensionRequest,
): Promise<R> {
  return browser.runtime.sendMessage(msg) as Promise<R>
}
