import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'Everyday', // placeholder name, change whenever you like
  description: 'Discover the lives of ordinary people.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="mx-auto flex w-full max-w-xl items-center justify-between px-5 pt-6">
          <Link href="/" className="font-semibold">
            Everyday
          </Link>
          <nav className="flex gap-4 text-sm text-stone-600">
            <Link href="/new" className="hover:text-stone-900">Share</Link>
            <Link href="/inbox" className="hover:text-stone-900">Notes</Link>
            <Link href="/me" className="hover:text-stone-900">Me</Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-xl px-5 py-8">{children}</main>
      </body>
    </html>
  )
}
