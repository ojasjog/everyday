import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getViewer } from '@/lib/supabase/server'
import { formatDate } from '@/components/post-card'
import { sheetClass } from '@/lib/ui'

export const metadata: Metadata = { title: 'Notes · Everyday' }

type Note = {
  id: string
  body: string
  created_at: string
  sender: { id: string; display_name: string } | null
  post: { body: string } | null
}

export default function InboxPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-[1.75rem] font-medium leading-tight">Notes to you</h1>
      <Suspense fallback={<p className="text-pencil">Loading…</p>}>
        <Notes />
      </Suspense>
    </div>
  )
}

async function Notes() {
  const { supabase, uid } = await getViewer()
  if (!uid) redirect('/login')

  const { data } = await supabase
    .from('notes')
    .select('id, body, created_at, sender:profiles!notes_sender_id_fkey(id, display_name), post:posts(body)')
    .eq('recipient_id', uid)
    .order('created_at', { ascending: false })
  const notes = (data ?? []) as unknown as Note[]

  if (!notes.length) return <p className="text-pencil">No notes yet.</p>

  return (
    <ul className="space-y-8">
      {notes.map((n) => (
        <li key={n.id} className={`${sheetClass} space-y-4`}>
          <time dateTime={n.created_at} className="block text-right text-sm text-pencil">
            {formatDate(n.created_at)}
          </time>
          {n.post && (
            <p className="border-l-2 border-rule pl-3 text-sm text-pencil">
              About your post: {n.post.body.length > 140 ? n.post.body.slice(0, 140) + '…' : n.post.body}
            </p>
          )}
          <p className="whitespace-pre-wrap break-words font-serif text-[1.0625rem] leading-[1.7]">{n.body}</p>
          <p className="text-right font-serif italic">
            &mdash;{' '}
            {n.sender ? (
              <Link href={`/u/${n.sender.id}`} className="hover:underline">
                {n.sender.display_name}
              </Link>
            ) : (
              'Someone'
            )}
          </p>
        </li>
      ))}
    </ul>
  )
}
