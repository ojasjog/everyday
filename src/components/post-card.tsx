import Link from 'next/link'

export type Post = {
  id: string
  body: string
  image_path: string | null
  created_at: string
}

export type Author = { id: string; display_name: string; location: string | null }

export function imageUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-images/${path}`
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Shows a post and nothing about how others reacted to it. Keep it that way.
export default function PostCard({
  post,
  author,
  children,
}: {
  post: Post
  author?: Author
  children?: React.ReactNode
}) {
  return (
    <article className="space-y-3 rounded-2xl border border-stone-200 bg-white px-5 py-4">
      <header className="text-sm text-stone-500">
        {author && (
          <>
            <Link href={`/u/${author.id}`} className="font-medium text-stone-800 hover:underline">
              {author.display_name}
            </Link>
            {author.location && <> · {author.location}</>}
            {' · '}
          </>
        )}
        <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
      </header>
      <p className="whitespace-pre-wrap break-words">{post.body}</p>
      {post.image_path && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl(post.image_path)} alt="" loading="lazy" className="w-full rounded-lg" />
      )}
      {children}
    </article>
  )
}
