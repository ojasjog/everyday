import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getViewer } from '@/lib/supabase/server'
import PostCard, { type Post } from '@/components/post-card'
import { buttonClass, inputClass, linkButtonClass } from '@/lib/ui'
import { banUser, createInvites, dismissReport, removePost } from './actions'

export const metadata: Metadata = { title: 'Admin · Everyday' }

type Report = {
  id: string
  reason: string
  created_at: string
  post: (Post & { author: { id: string; display_name: string } | null }) | null
}

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="text-pencil">Loading…</p>}>
      <Admin />
    </Suspense>
  )
}

async function Admin() {
  const { supabase, uid } = await getViewer()
  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (!uid || isAdmin !== true) notFound()

  const [{ data: reportRows }, { data: invites }] = await Promise.all([
    supabase
      .from('reports')
      .select('id, reason, created_at, post:posts(id, body, image_path, created_at, author:profiles(id, display_name))')
      .eq('resolved', false)
      .order('created_at'),
    supabase.from('invite_codes').select('code').is('used_by', null).order('created_at', { ascending: false }),
  ])
  const reports = (reportRows ?? []) as unknown as Report[]

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <h1 className="font-serif text-[1.75rem] font-medium leading-tight">Open reports</h1>
        {!reports.length && <p className="text-pencil">Nothing to review.</p>}
        {reports.map((r) => (
          <div key={r.id} className="space-y-3">
            <p className="text-sm">
              <span className="text-pencil">Reason:</span> {r.reason}
            </p>
            {r.post ? (
              <PostCard post={r.post} author={r.post.author ? { ...r.post.author, location: null } : undefined}>
                <div className="flex flex-wrap gap-3 border-t border-rule pt-3">
                  <form action={removePost}>
                    <input type="hidden" name="post_id" value={r.post.id} />
                    <button className={`${buttonClass} text-sm`}>Remove post</button>
                  </form>
                  <form action={dismissReport}>
                    <input type="hidden" name="report_id" value={r.id} />
                    <button className={linkButtonClass}>Dismiss</button>
                  </form>
                  {r.post.author && r.post.author.id !== uid && (
                    <form action={banUser}>
                      <input type="hidden" name="user_id" value={r.post.author.id} />
                      <button className={`${linkButtonClass} text-red-700`}>
                        Ban {r.post.author.display_name}
                      </button>
                    </form>
                  )}
                </div>
              </PostCard>
            ) : (
              <form action={dismissReport}>
                <input type="hidden" name="report_id" value={r.id} />
                <button className={linkButtonClass}>Post is gone — dismiss</button>
              </form>
            )}
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-xl font-medium">Invite codes</h2>
        <form action={createInvites} className="flex gap-2">
          <input type="number" name="count" min={1} max={50} defaultValue={5} className={`${inputClass} w-24`} />
          <button className={`${buttonClass} text-sm`}>Generate</button>
        </form>
        {invites?.length ? (
          <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
            {invites.map((i) => <li key={i.code}>{i.code}</li>)}
          </ul>
        ) : (
          <p className="text-pencil">No unused codes.</p>
        )}
      </section>

      <Link href="/" className={linkButtonClass}>Back to the feed</Link>
    </div>
  )
}
