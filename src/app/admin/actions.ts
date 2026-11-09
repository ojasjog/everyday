'use server'

import { revalidatePath } from 'next/cache'
import { getViewer } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Every action re-checks admin status: never trust that the form was only shown to admins.
async function requireAdmin() {
  const { supabase, uid } = await getViewer()
  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (!uid || isAdmin !== true) throw new Error('Forbidden')
  return { supabase, uid }
}

function must(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

export async function removePost(formData: FormData) {
  const { supabase } = await requireAdmin()
  must((await supabase.rpc('admin_remove_post', { target: String(formData.get('post_id')) })).error)
  revalidatePath('/admin')
}

export async function dismissReport(formData: FormData) {
  const { supabase } = await requireAdmin()
  must((await supabase.from('reports').update({ resolved: true }).eq('id', String(formData.get('report_id')))).error)
  revalidatePath('/admin')
}

export async function banUser(formData: FormData) {
  const { supabase, uid } = await requireAdmin()
  const target = String(formData.get('user_id'))
  if (target === uid) throw new Error("You can't ban yourself")

  // Supabase Auth ban: blocks sign-in and token refresh. Undo in the dashboard (Auth > Users).
  must((await createAdminClient().auth.admin.updateUserById(target, { ban_duration: '876000h' })).error)
  must((await supabase.rpc('admin_remove_user_posts', { target })).error)
  revalidatePath('/admin')
}

export async function createInvites(formData: FormData) {
  const { supabase } = await requireAdmin()
  const n = Math.min(Math.max(Number(formData.get('count')) || 5, 1), 50)
  must((await supabase.rpc('admin_create_invites', { n })).error)
  revalidatePath('/admin')
}
