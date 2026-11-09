import type { Metadata } from 'next'
import NewPostForm from './new-post-form'

export const metadata: Metadata = { title: 'Share · Everyday' }

export default function NewPostPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-serif text-[1.75rem] font-medium leading-tight">Share something from your day</h1>
        <p className="text-sm text-pencil">
          About your own life, in your own words. Up to 3 posts a day.
        </p>
      </div>
      <NewPostForm />
    </div>
  )
}
