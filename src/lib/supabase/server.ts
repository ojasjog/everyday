import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// For Server Components, Server Actions and Route Handlers.
// Always create a fresh client per request; never keep it in a global.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component, which can't write cookies.
            // Safe to ignore because src/proxy.ts refreshes the session.
          }
        },
      },
    }
  )
}
