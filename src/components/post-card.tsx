import Link from 'next/link'
import { sheetClass } from '@/lib/ui'

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

// A post set like a letter: dateline, body, sign-off. It shows nothing about how
// others reacted to it. Keep it that way.
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
    <article className={`${sheetClass} space-y-4`}>
      <time dateTime={post.created_at} className="block text-right text-sm text-pencil">
        {formatDate(post.created_at)}
      </time>
      <p className="whitespace-pre-wrap break-words font-serif text-[1.0625rem] leading-[1.7]">{post.body}</p>
      {post.image_path && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl(post.image_path)} alt="" loading="lazy" className="w-full rounded-sm" />
      )}
      {author && (
        <p className="text-right font-serif italic">
          &mdash;{' '}
          <Link href={`/u/${author.id}`} className="hover:underline">
            {author.display_name}
          </Link>
          {author.location && <span className="text-pencil">, {author.location}</span>}
        </p>
      )}
      {children}
    </article>
  )
}
