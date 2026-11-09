import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getViewer } from '@/lib/supabase/server'
import { formatDate } from '@/components/post-card'

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
      <h1 className="text-2xl font-semibold">Notes to you</h1>
      <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
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

  if (!notes.length) return <p className="text-stone-500">No notes yet.</p>

  return (
    <ul className="space-y-4">
      {notes.map((n) => (
        <li key={n.id} className="space-y-2 rounded-2xl border border-stone-200 bg-white px-5 py-4">
          <p className="text-sm text-stone-500">
            {n.sender ? (
              <Link href={`/u/${n.sender.id}`} className="font-medium text-stone-800 hover:underline">
                {n.sender.display_name}
              </Link>
            ) : (
              'Someone'
            )}
            {' · '}
            {formatDate(n.created_at)}
          </p>
          <p className="whitespace-pre-wrap break-words">{n.body}</p>
          {n.post && (
            <p className="border-l-2 border-stone-200 pl-3 text-sm text-stone-500">
              About: {n.post.body.length > 140 ? n.post.body.slice(0, 140) + '…' : n.post.body}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}
