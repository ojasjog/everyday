import type { Metadata } from 'next'
import NewPostForm from './new-post-form'

export const metadata: Metadata = { title: 'Share · Everyday' }

export default function NewPostPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Share something from your day</h1>
        <p className="text-sm text-stone-600">
          About your own life, in your own words. Up to 3 posts a day.
        </p>
      </div>
      <NewPostForm />
    </div>
  )
}
