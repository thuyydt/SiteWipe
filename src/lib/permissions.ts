/** Pages where scripting/cookies are unavailable */

const RESTRICTED_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'devtools://',
  'about:',
  'view-source:',
  'moz-extension://',
  'safari-web-extension://',
]

/** Firefox (and policy) blocks extensions on AMO / discovery — injection yields “missing host permission”. */
const EXTENSION_RESTRICTED_HTTP_HOSTS = new Set([
  'addons.mozilla.org',
  'discovery.addons.mozilla.org',
])

export function isRestrictedUrl(url: string | undefined | null): boolean {
  if (!url) return true
  const u = url.toLowerCase()
  if (RESTRICTED_PREFIXES.some((p) => u.startsWith(p))) return true
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
    return EXTENSION_RESTRICTED_HTTP_HOSTS.has(parsed.hostname.toLowerCase())
  } catch {
    return false
  }
}

export function originFromUrl(url: string): string | null {
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}
