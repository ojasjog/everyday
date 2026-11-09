export const inputClass =
  'w-full rounded-sm border border-rule bg-sheet px-3 py-2 text-base text-ink outline-none placeholder:text-pencil focus:border-ink'

export const buttonClass = 'rounded-sm bg-ink px-4 py-2 font-medium text-sheet hover:bg-ink/90 disabled:opacity-60'

export const linkButtonClass = 'text-sm text-pencil underline decoration-rule underline-offset-4 hover:text-ink hover:decoration-ink'

export const errorClass = 'rounded-sm border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900'

// A post or note set like a letter: a flat sheet, no shadow.
export const sheetClass = 'rounded-sm bg-sheet px-5 py-5 sm:px-7'

// Database trigger messages (errcode P0001) are written for people; anything else isn't.
export function friendlyError(error: { code?: string; message: string }) {
  return error.code === 'P0001' ? error.message : 'Something went wrong. Please try again.'
}
