/** User-facing copy when tabs/pages block extension storage/script APIs (any browser). */
export const RESTRICTED_PAGE_USER_MESSAGE =
  "This page doesn't allow extensions to read or clear site data (built-in browser pages like the new tab, settings, or extension stores). Open a normal website tab."

/** Raw errors from executeScript / host policy → friendly restricted-page explanation. */
const RESTRICTED_PAGE_ERROR_PATTERNS: RegExp[] = [
  /missing host permission for the tab/i,
  /cannot access contents/i,
  /must request permission to access/i,
]

export function friendlyExtensionError(message: string): string {
  const m = message.trim()
  if (RESTRICTED_PAGE_ERROR_PATTERNS.some((re) => re.test(m))) return RESTRICTED_PAGE_USER_MESSAGE
  return message
}

export function formatCaughtExtensionError(error: unknown): string {
  return friendlyExtensionError(error instanceof Error ? error.message : String(error))
}
