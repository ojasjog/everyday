import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Bypasses Row Level Security. Server-only: never import this from a Client
// Component. Use it only for admin tasks (e.g. banning an auth user).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
