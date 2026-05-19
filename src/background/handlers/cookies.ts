import type Browser from 'webextension-polyfill'
import browser from '@/extension/browser'
import { cookieSetUrl } from '@/lib/cookieUrl'
import type { CookieRemovePayload, CookieUpsertPayload } from '@/lib/schema'

export async function upsertInspectCookie(
  pageUrl: string,
  payload: CookieUpsertPayload,
): Promise<void> {
  const path = payload.path?.startsWith('/') ? payload.path : `/${payload.path ?? ''}`
  const url = cookieSetUrl(pageUrl, {
    domain: payload.domain,
    path,
    secure: payload.secure,
  })
  const setDetails: Browser.Cookies.SetDetailsType = {
    url,
    name: payload.name,
    value: payload.value,
    domain: payload.domain,
    path,
    secure: payload.secure,
    httpOnly: payload.httpOnly,
    sameSite: payload.sameSite,
    expirationDate: payload.session ? undefined : payload.expirationDate,
  }
  if (payload.storeId) setDetails.storeId = payload.storeId
  if (payload.partitionKey)
    setDetails.partitionKey = payload.partitionKey as Browser.Cookies.PartitionKey
  await browser.cookies.set(setDetails)
}

export async function removeInspectCookie(
  pageUrl: string,
  payload: CookieRemovePayload,
): Promise<void> {
  const path = payload.path?.startsWith('/') ? payload.path : `/${payload.path ?? ''}`
  const url = cookieSetUrl(pageUrl, {
    domain: payload.domain,
    path,
    secure: payload.secure,
  })
  const ok = await browser.cookies.remove({
    url,
    name: payload.name,
    ...(payload.storeId != null ? { storeId: payload.storeId } : {}),
    ...(payload.partitionKey != null
      ? {
          partitionKey: payload.partitionKey as Browser.Cookies.PartitionKey,
        }
      : {}),
  })
  if (!ok) throw new Error('Cookie not found or could not be removed')
}
