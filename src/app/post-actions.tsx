'use client'

import { useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { buttonClass, errorClass, friendlyError, inputClass, linkButtonClass } from '@/lib/ui'

// Private like (no count), private note, and report. Each talks to Supabase directly;
// RLS and triggers do the enforcing.
export default function PostActions({ postId, initiallyLiked }: { postId: string; initiallyLiked: boolean }) {
  const [liked, setLiked] = useState(initiallyLiked)
  const [busy, setBusy] = useState(false)

  async function toggleLike() {
    setBusy(true)
    const supabase = createClient()
    const { error } = liked
      ? await supabase.from('likes').delete().eq('post_id', postId)
      : await supabase.from('likes').insert({ post_id: postId })
    // 23505 = already liked (e.g. in another tab); treat as liked.
    if (!error || error.code === '23505') setLiked(!liked)
    setBusy(false)
  }

  return (
    <div className="space-y-3 border-t border-stone-100 pt-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <button
          type="button"
          onClick={toggleLike}
          disabled={busy}
          aria-pressed={liked}
          className="text-sm text-stone-700"
          title="Only you can see this"
        >
          {liked ? '♥ Liked' : '♡ Like'}
        </button>
      </div>
      <MessageBox
        label="Send a private note"
        placeholder="Only they will see this."
        maxLength={1000}
        done="Your note is on its way."
        submit={(body) => createClient().from('notes').insert({ post_id: postId, body })}
      />
      <MessageBox
        label="Report"
        placeholder="What's wrong with this post?"
        maxLength={500}
        done="Thanks. Someone will take a look."
        submit={(reason) => createClient().from('reports').insert({ post_id: postId, reason })}
      />
    </div>
  )
}

function MessageBox({
  label,
  placeholder,
  maxLength,
  done,
  submit,
}: {
  label: string
  placeholder: string
  maxLength: number
  done: string
  submit: (text: string) => PromiseLike<{ error: { code?: string; message: string } | null }>
}) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    setError(null)
    const { error } = await submit(text.trim())
    setSending(false)
    if (error) setError(friendlyError(error))
    else setSent(true)
  }

  if (sent) return <p className="text-sm text-stone-500">{done}</p>

  return (
    <details>
      <summary className={`${linkButtonClass} cursor-pointer list-none`}>{label}</summary>
      <form onSubmit={onSubmit} className="mt-2 space-y-2">
        <textarea
          required
          rows={3}
          maxLength={maxLength}
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={inputClass}
        />
        {error && <p className={errorClass}>{error}</p>}
        <button type="submit" disabled={sending} className={`${buttonClass} text-sm`}>
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </details>
  )
}
