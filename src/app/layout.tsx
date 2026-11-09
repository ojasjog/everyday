import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { Atkinson_Hyperlegible_Next, Literata } from 'next/font/google'
import './globals.css'

const literata = Literata({ subsets: ['latin'], variable: '--font-literata', style: ['normal', 'italic'] })
const atkinson = Atkinson_Hyperlegible_Next({ subsets: ['latin'], variable: '--font-atkinson' })

export const metadata: Metadata = {
  title: 'Everyday', // placeholder name, change whenever you like
  description: 'Discover the lives of ordinary people.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#e9eef2',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${literata.variable} ${atkinson.variable}`}>
      <body className="min-h-screen antialiased">
        <header className="mx-auto flex w-full max-w-[34rem] items-baseline justify-between px-4 pt-6">
          <Link href="/" className="font-serif text-xl font-medium">
            Everyday
          </Link>
          <nav className="flex gap-5 text-sm text-pencil">
            <Link href="/new" className="hover:text-ink">Share</Link>
            <Link href="/inbox" className="hover:text-ink">Notes</Link>
            <Link href="/me" className="hover:text-ink">Me</Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-[34rem] px-4 py-8">{children}</main>
      </body>
    </html>
  )
}
