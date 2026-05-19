/** Utilities for Inspect tab JSON detection/formatting */

export function looksLikeJsonString(value: string): boolean {
  const t = value.trim()
  if (!t.startsWith('{') && !t.startsWith('[')) return false
  try {
    JSON.parse(t)
    return true
  } catch {
    return false
  }
}

export function formatJsonMaybe(value: string): string {
  const t = value.trim()
  try {
    return JSON.stringify(JSON.parse(t), null, 2)
  } catch {
    return value
  }
}

export function compactJsonMaybe(value: string): string {
  const t = value.trim()
  try {
    return JSON.stringify(JSON.parse(t))
  } catch {
    return value
  }
}

export function isBooleanString(value: string): boolean {
  return value === 'true' || value === 'false'
}

export function toggleBooleanString(value: string): string {
  return value === 'true' ? 'false' : 'true'
}

export function approximatePayloadBytes(obj: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(obj)).length
  } catch {
    return 0
  }
}

export function formatRelativeTime(ts: number, now = Date.now()): string {
  const sec = Math.round((now - ts) / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 48) return `${hr} hr ago`
  const days = Math.round(hr / 24)
  return `${days} days ago`
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/** Single-line preview for Inspect tables (character budget includes ellipsis). */
export function ellipsisPreview(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  if (maxChars <= 1) return '…'
  return `${text.slice(0, maxChars - 1)}…`
}

/** Portable snapshot strings (UTF-8 safe Base64) */
export function toBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

export function fromBase64Utf8(b64: string): string {
  const bin = atob(b64.trim())
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}
