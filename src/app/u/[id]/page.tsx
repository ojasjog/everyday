import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PostCard, { type Post } from '@/components/post-card'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
      <Profile params={params} />
    </Suspense>
  )
}

// Public page: who they are and what they've shared. No counts, no likes, no "joined X ago" stats.
async function Profile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) notFound()

  const supabase = await createClient()
  const [{ data: profile }, { data: posts }] = await Promise.all([
    supabase.from('profiles').select('id, display_name, bio, location').eq('id', id).maybeSingle(),
    supabase
      .from('posts')
      .select('id, body, image_path, created_at')
      .eq('author_id', id)
      .eq('is_removed', false)
      .order('created_at', { ascending: false }),
  ])
  if (!profile) notFound()

  return (
    <div className="space-y-8">
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold">{profile.display_name}</h1>
        {profile.location && <p className="text-sm text-stone-500">{profile.location}</p>}
        {profile.bio && <p className="whitespace-pre-wrap pt-2 text-stone-700">{profile.bio}</p>}
      </section>
      <section className="space-y-6">
        {!posts?.length && <p className="text-stone-500">Nothing shared yet.</p>}
        {(posts as Post[] | null)?.map((p) => <PostCard key={p.id} post={p} />)}
      </section>
    </div>
  )
}
