// Tujuan setelah login (?next=) — hanya path internal, cegah open redirect
// ("//host", "/\host", URL absolut, dan karakter kontrol yang dibuang browser: "/\t/host" → "//host").
const BASE = 'http://internal.invalid'

export function safeNextPath(next: string | null | undefined): string | null {
  if (typeof next !== 'string' || /[\x00-\x1f\x7f]/.test(next)) return null
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null
  try {
    const url = new URL(next, BASE)
    return url.origin === BASE ? url.pathname + url.search + url.hash : null
  } catch {
    return null
  }
}
