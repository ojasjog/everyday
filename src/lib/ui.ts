export const inputClass =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base outline-none focus:border-stone-500'

export const buttonClass =
  'rounded-lg bg-stone-800 px-4 py-2 text-white disabled:opacity-60'

export const linkButtonClass = 'text-sm text-stone-600 underline underline-offset-2 hover:text-stone-900'

export const errorClass = 'rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900'

// Database trigger messages (errcode P0001) are written for people; anything else isn't.
export function friendlyError(error: { code?: string; message: string }) {
  return error.code === 'P0001' ? error.message : 'Something went wrong. Please try again.'
}
