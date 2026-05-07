'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function resetUserPassword(userId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (currentProfile?.role !== 'kadiv') return { error: 'Tidak ada akses' }

  const admin = createAdminClient()
  const { data: userData, error: fetchError } = await admin.auth.admin.getUserById(userId)
  if (fetchError || !userData.user?.email) return { error: 'User tidak ditemukan' }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://monitor-giat.vercel.app'
  const { error } = await admin.auth.resetPasswordForEmail(userData.user.email, {
    redirectTo: `${baseUrl}/auth/callback?next=/update-password`,
  })

  if (error) return { error: error.message }
  return {}
}
