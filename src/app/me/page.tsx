import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getViewer } from '@/lib/supabase/server'
import PostCard, { type Post } from '@/components/post-card'
import { PostControls, ProfileForm, SignOutButton } from './me-client'

export const metadata: Metadata = { title: 'Me · Everyday' }

export default function MePage() {
  return (
    <Suspense fallback={<p className="text-pencil">Loading…</p>}>
      <Me />
    </Suspense>
  )
}

async function Me() {
  const { supabase, uid } = await getViewer()
  if (!uid) redirect('/login')

  const [{ data: profile }, { data: posts }] = await Promise.all([
    supabase.from('profiles').select('id, display_name, bio, location').eq('id', uid).single(),
    supabase
      .from('posts')
      .select('id, body, image_path, created_at, is_removed')
      .eq('author_id', uid)
      .order('created_at', { ascending: false }),
  ])
  if (!profile) redirect('/login')

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h1 className="font-serif text-[1.75rem] font-medium leading-tight">You</h1>
          <Link href={`/u/${uid}`} className="text-sm underline">
            See your public page
          </Link>
        </div>
        <ProfileForm profile={profile} />
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-xl font-medium">Your archive</h2>
        {!posts?.length && (
          <p className="text-pencil">
            Nothing yet. <Link href="/new" className="underline">Share something</Link>.
          </p>
        )}
        {(posts as (Post & { is_removed: boolean })[] | null)?.map((p) => (
          <PostCard key={p.id} post={p}>
            {p.is_removed && (
              <p className="text-sm text-pencil">This post was removed by a moderator.</p>
            )}
            <PostControls post={p} />
          </PostCard>
        ))}
      </section>

      <SignOutButton />
    </div>
  )
}
