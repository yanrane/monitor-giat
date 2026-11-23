import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { safeNextPath } from '@/lib/safe-next'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Redirect unauthenticated users away from protected routes
  if (!user && pathname.startsWith('/(protected)') === false && pathname !== '/login') {
    const isProtected =
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/departments') ||
      pathname.startsWith('/activities') ||
      pathname.startsWith('/calendar') ||
      pathname.startsWith('/notifications') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/daily-log') ||
      pathname.startsWith('/monitor') ||
      pathname.startsWith('/progress') ||
      pathname.startsWith('/usulan')

    if (isProtected) {
      // Bawa tujuan asli (?next=) supaya link WA tetap terbuka setelah login
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.search = ''
      url.searchParams.set('next', pathname + request.nextUrl.search)
      return NextResponse.redirect(url)
    }
  }

  // Redirect authenticated users away from login (ke tujuan ?next= bila aman)
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    const next = safeNextPath(request.nextUrl.searchParams.get('next'))
    url.search = ''
    url.pathname = '/dashboard'
    return NextResponse.redirect(next ? new URL(next, request.url) : url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
