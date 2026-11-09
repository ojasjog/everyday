'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { buttonClass, errorClass, friendlyError, inputClass } from '@/lib/ui'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export default function NewPostForm() {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!body.trim()) return setError('Write a few words first.')
    if (file && !IMAGE_TYPES.includes(file.type)) return setError('Images only: JPEG, PNG, WebP or GIF.')
    if (file && file.size > MAX_IMAGE_BYTES) return setError('That image is over 5MB.')

    setSaving(true)
    const supabase = createClient()
    const { data: claims } = await supabase.auth.getClaims()
    const uid = claims?.claims?.sub
    if (!uid) return router.push('/login')

    // Upload straight to Storage (Server Actions cap bodies at 1MB). Bucket + policy
    // enforce size, type, and the "<uid>/" folder server-side.
    let image_path: string | null = null
    if (file) {
      image_path = `${uid}/${crypto.randomUUID()}.${file.type.split('/')[1]}`
      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(image_path, file, { contentType: file.type })
      if (uploadError) {
        setSaving(false)
        return setError("Couldn't upload that image. Try a smaller one.")
      }
    }

    const { error: insertError } = await supabase.from('posts').insert({ body: body.trim(), image_path })
    if (insertError) {
      if (image_path) await supabase.storage.from('post-images').remove([image_path])
      setSaving(false)
      return setError(friendlyError(insertError))
    }

    router.push('/me')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <textarea
        required
        rows={7}
        maxLength={2000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What happened today?"
        className={inputClass}
      />
      <label className="block space-y-1 text-sm">
        <span>Photo (optional, up to 5MB)</span>
        <input
          type="file"
          accept={IMAGE_TYPES.join(',')}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm"
        />
      </label>
      {error && <p className={errorClass}>{error}</p>}
      <button type="submit" disabled={saving} className={`${buttonClass} w-full`}>
        {saving ? 'Sharing…' : 'Share'}
      </button>
    </form>
  )
}
