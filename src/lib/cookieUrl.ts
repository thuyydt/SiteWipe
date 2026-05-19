/** Build URL suitable for cookies.set/remove from page URL + cookie identity fields */

export interface CookieUrlInput {
  domain: string
  path: string
  secure?: boolean
}

export function cookieSetUrl(pageUrlOrOrigin: string, c: CookieUrlInput): string {
  try {
    const o = new URL(pageUrlOrOrigin)
    const scheme = c.secure ? 'https:' : o.protocol === 'http:' ? 'http:' : 'https:'
    const host = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain
    const rawPath = c.path?.startsWith('/') ? c.path : `/${c.path ?? ''}`
    return `${scheme}//${host}${rawPath}`
  } catch {
    const scheme = c.secure ? 'https:' : 'http:'
    const host = c.domain.replace(/^\./, '')
    return `${scheme}//${host}${c.path || '/'}`
  }
}
