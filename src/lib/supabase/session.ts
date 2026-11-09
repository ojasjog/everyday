import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Refreshes the Supabase auth session on every request and writes the
// refreshed cookies back. Server Components can't write cookies themselves.
export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If env vars are missing (e.g. not set on Vercel yet), don't crash every request.
  if (!url || !key) return NextResponse.next({ request })

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(url, key, {
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
  })

  // IMPORTANT: no code between createServerClient and getClaims().
  // getClaims() verifies the token and triggers the refresh when needed.
  const { data } = await supabase.auth.getClaims()

  const path = request.nextUrl.pathname
  const needsLogin = ['/new', '/me', '/inbox', '/admin'].some(
    (p) => path === p || path.startsWith(p + '/')
  )
  if (!data?.claims && needsLogin) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // IMPORTANT: return supabaseResponse as-is, or the refreshed cookies are lost.
  return supabaseResponse
}
