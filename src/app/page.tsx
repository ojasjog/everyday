import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'

// TEMPORARY status page for step 1. It gets replaced by the real feed in step 4.

function StatusBox({ ok, message }: { ok: boolean; message: string }) {
  return (
    <p
      className={`rounded-lg border px-4 py-3 text-sm ${
        ok
          ? 'border-green-300 bg-green-50 text-green-900'
          : 'border-red-300 bg-red-50 text-red-900'
      }`}
    >
      {ok ? '✓ ' : '✗ '}
      {message}
    </p>
  )
}

async function Status() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return <StatusBox ok={false} message="Missing Supabase environment variables in .env.local" />
  }

  const supabase = await createClient()
  const { error } = await supabase.from('posts').select('id').limit(1)

  if (error) return <StatusBox ok={false} message={error.message} />
  return <StatusBox ok message="Connected to Supabase. The posts table is reachable." />
}

export default function Home() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Setup check</h1>
      <Suspense fallback={<p className="text-sm text-stone-500">Checking connection…</p>}>
        <Status />
      </Suspense>
    </div>
  )
}