'use client'

import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'signup'

const inputClass =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base outline-none focus:border-stone-500'

export default function LoginForm() {
  const searchParams = useSearchParams()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(
    searchParams.get('error') === 'link'
      ? "That sign-in link didn't work. Open the link in the same browser where you asked for it, or request a new one."
      : null
  )

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (mode === 'signup' && (!displayName.trim() || !inviteCode.trim())) {
      setError('Please enter a name and your invite code.')
      return
    }

    setSending(true)
    const supabase = createClient()
    const emailRedirectTo = `${window.location.origin}/auth/callback`

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options:
        mode === 'login'
          ? { shouldCreateUser: false, emailRedirectTo }
          : {
              shouldCreateUser: true,
              emailRedirectTo,
              // Read by the handle_new_user() trigger in the database.
              data: {
                invite_code: inviteCode.trim(),
                display_name: displayName.trim(),
              },
            },
    })
    setSending(false)

    if (authError) {
      console.error('signInWithOtp error:', authError)

      const rateLimited =
        authError.status === 429 || /rate limit/i.test(authError.message)
      const noAccount = /signups not allowed/i.test(authError.message)

      if (rateLimited) {
        setError('Too many emails requested. Please wait a bit and try again.')
        return
      }
      if (mode === 'login' && noAccount) {
        // Don't reveal which emails have accounts: show the normal "sent" screen.
        setSent(true)
        return
      }
      if (mode === 'signup') {
        // The database rejects bad or already-used invite codes.
        setError("That invite code isn't valid, or it has already been used.")
        return
      }
      setError('Something went wrong. Please try again.')
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="space-y-3 rounded-lg border border-stone-300 bg-white px-4 py-5">
        <p className="font-medium">Check your email</p>
        <p className="text-sm text-stone-600">
          If <strong>{email.trim()}</strong> can sign in, a link is on its way. Open it in
          this same browser.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="text-sm underline"
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-4 text-sm">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={mode === 'login' ? 'font-semibold underline' : 'text-stone-500'}
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={mode === 'signup' ? 'font-semibold underline' : 'text-stone-500'}
        >
          I have an invite code
        </button>
      </div>

      <label className="block space-y-1">
        <span className="text-sm">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </label>

      {mode === 'signup' && (
        <>
          <label className="block space-y-1">
            <span className="text-sm">Your name</span>
            <input
              type="text"
              required
              maxLength={50}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm">Invite code</span>
            <input
              type="text"
              required
              autoCapitalize="characters"
              autoComplete="off"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className={inputClass}
            />
          </label>
        </>
      )}

      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-lg bg-stone-800 px-4 py-2 text-white disabled:opacity-60"
      >
        {sending ? 'Sending…' : 'Email me a link'}
      </button>
    </form>
  )
}
