// Tujuan setelah login (?next=) — hanya path internal, cegah open redirect
// ("//host", "/\host", URL absolut).
export function safeNextPath(next: string | null | undefined): string | null {
  if (typeof next !== 'string' || !next.startsWith('/')) return null
  if (next.startsWith('//') || next.startsWith('/\\')) return null
  return next
}
