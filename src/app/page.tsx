import { Suspense } from 'react'
import Link from 'next/link'
import { getViewer } from '@/lib/supabase/server'
import PostCard, { type Post } from '@/components/post-card'
import PostActions from './post-actions'

type FeedPost = Post & { author_id: string; display_name: string; location: string | null }

export default function Home() {
  return (
    <Suspense fallback={<p className="text-pencil">Finding a few people for you…</p>}>
      <Feed />
    </Suspense>
  )
}

async function Feed() {
  const { supabase, uid } = await getViewer()

  if (!uid) {
    return (
      <div className="space-y-3">
        <h1 className="font-serif text-[1.75rem] font-medium leading-tight">Ordinary lives, in their own words.</h1>
        <p className="text-pencil">
          A few posts a day from people you don&rsquo;t know. No followers, no numbers.
        </p>
        <Link href="/login" className="inline-block underline">
          Log in or join with an invite
        </Link>
      </div>
    )
  }

  const { data, error } = await supabase.rpc('get_feed', { limit: 20 })
  if (error) throw error
  const posts = (data ?? []) as FeedPost[]

  // Only the viewer's own likes are readable (RLS), so this is "did I like it", never a count.
  const { data: myLikes } = posts.length
    ? await supabase.from('likes').select('post_id').in('post_id', posts.map((p) => p.id))
    : { data: [] }
  const liked = new Set((myLikes ?? []).map((l) => l.post_id as string))

  return (
    <div className="space-y-8">
      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          author={{ id: p.author_id, display_name: p.display_name, location: p.location }}
        >
          <PostActions postId={p.id} initiallyLiked={liked.has(p.id)} />
        </PostCard>
      ))}
      <p className="py-14 text-center font-serif text-xl italic text-pencil">
        That&rsquo;s enough for today. Come back later.
      </p>
    </div>
  )
}
