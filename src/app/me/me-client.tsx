'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Post } from '@/components/post-card'
import { buttonClass, errorClass, friendlyError, inputClass, linkButtonClass } from '@/lib/ui'

type Profile = { id: string; display_name: string; bio: string | null; location: string | null }

export function ProfileForm({ profile }: { profile: Profile }) {
  const [name, setName] = useState(profile.display_name)
  const [bio, setBio] = useState(profile.bio ?? '')
  const [location, setLocation] = useState(profile.location ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('saving')
    setError(null)
    const { error } = await createClient()
      .from('profiles')
      .update({ display_name: name.trim(), bio: bio.trim() || null, location: location.trim() || null })
      .eq('id', profile.id)
    if (error) {
      setError(friendlyError(error))
      setStatus('idle')
    } else setStatus('saved')
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block space-y-1">
        <span className="text-sm">Name</span>
        <input required maxLength={50} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm">Where you are (optional)</span>
        <input maxLength={100} value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm">A little about you (optional)</span>
        <textarea rows={3} maxLength={500} value={bio} onChange={(e) => setBio(e.target.value)} className={inputClass} />
      </label>
      {error && <p className={errorClass}>{error}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={status === 'saving'} className={`${buttonClass} text-sm`}>
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>
        {status === 'saved' && <span className="text-sm text-stone-500">Saved.</span>}
      </div>
    </form>
  )
}

export function PostControls({ post }: { post: Post }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(post.body)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await createClient().from('posts').update({ body: body.trim() }).eq('id', post.id)
    setBusy(false)
    if (error) return setError(friendlyError(error))
    setEditing(false)
    router.refresh()
  }

  async function remove() {
    if (!confirm('Delete this post for good?')) return
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('posts').delete().eq('id', post.id)
    if (error) {
      setBusy(false)
      return setError(friendlyError(error))
    }
    if (post.image_path) await supabase.storage.from('post-images').remove([post.image_path])
    router.refresh()
  }

  if (editing) {
    return (
      <form onSubmit={save} className="space-y-2">
        <textarea required rows={5} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} className={inputClass} />
        {error && <p className={errorClass}>{error}</p>}
        <div className="flex gap-4">
          <button type="submit" disabled={busy} className={`${buttonClass} text-sm`}>Save</button>
          <button type="button" onClick={() => setEditing(false)} className={linkButtonClass}>Cancel</button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex gap-5 border-t border-stone-100 pt-3">
      <button type="button" onClick={() => setEditing(true)} className={linkButtonClass}>Edit</button>
      <button type="button" onClick={remove} disabled={busy} className={linkButtonClass}>Delete</button>
      {error && <p className={errorClass}>{error}</p>}
    </div>
  )
}

export function SignOutButton() {
  const router = useRouter()
  return (
    <button
      type="button"
      className={linkButtonClass}
      onClick={async () => {
        await createClient().auth.signOut()
        router.push('/login')
        router.refresh()
      }}
    >
      Sign out
    </button>
  )
}
