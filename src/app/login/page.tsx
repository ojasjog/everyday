import { Suspense } from 'react'
import type { Metadata } from 'next'
import LoginForm from './login-form'

export const metadata: Metadata = { title: 'Log in · Everyday' }

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-serif text-[1.75rem] font-medium leading-tight">Welcome</h1>
        <p className="text-sm text-pencil">
          We&rsquo;ll email you a link. No passwords.
        </p>
      </div>
      {/* LoginForm reads the URL (?error=...), so it must sit inside Suspense */}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
