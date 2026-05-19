/**
 * Centralized wrappers for APIs that vary across Chrome / Firefox / Safari (especially iOS).
 */
import type Browser from 'webextension-polyfill'
import browser from '@/extension/browser'

/** Chromium MV3 passes `{ origins: [...] }`; Firefox typings omit `origins` in RemovalOptions. */
export type RemovalOptionsWithOrigins = Browser.BrowsingData.RemovalOptions & {
  origins?: string[]
}

/** Chromium exposes cacheStorage in browsingData.remove; Firefox typings use `cache` only. */
export type DataTypeSetChromium = Browser.BrowsingData.DataTypeSet & {
  cacheStorage?: boolean
}

export async function browsingDataRemoveLogged(
  options: RemovalOptionsWithOrigins,
  dataToRemove: DataTypeSetChromium,
): Promise<void> {
  try {
    await browser.browsingData.remove(
      options as Browser.BrowsingData.RemovalOptions,
      dataToRemove as Browser.BrowsingData.DataTypeSet,
    )
  } catch (err) {
    console.warn('[Sitewipe] browsingData.remove failed', options, dataToRemove, err)
    throw err
  }
}
