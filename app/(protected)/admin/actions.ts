'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

type EditableRole = 'dept_head' | 'staff'

async function requireKadiv(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (currentProfile?.role !== 'kadiv') return { error: 'Tidak ada akses' }

  return {}
}

export async function updateUserProfile(
  userId: string,
  role: EditableRole,
  deptId: string,
): Promise<{ error?: string }> {
  const auth = await requireKadiv()
  if (auth.error) return auth

  if (!['dept_head', 'staff'].includes(role)) return { error: 'Role tidak valid' }
  if (!deptId) return { error: 'Departemen wajib dipilih' }

  const admin = createAdminClient()

  const { data: targetProfile, error: targetError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  if (targetError || !targetProfile) return { error: 'User tidak ditemukan' }
  if (targetProfile.role === 'kadiv') return { error: 'Akun Kadiv tidak boleh diubah dari halaman ini' }

  const { data: department, error: deptError } = await admin
    .from('departments')
    .select('id')
    .eq('id', deptId)
    .single()
  if (deptError || !department) return { error: 'Departemen tidak ditemukan' }

  const { error } = await admin
    .from('profiles')
    .update({ role, dept_id: deptId })
    .eq('id', userId)
  if (error) return { error: error.message }

  revalidatePath('/admin')
  return {}
}

export async function inviteUser(
  email: string,
  fullName: string,
  role: EditableRole,
  deptId: string,
): Promise<{ error?: string }> {
  const auth = await requireKadiv()
  if (auth.error) return auth

  const cleanEmail = email.trim().toLowerCase()
  const cleanName = fullName.trim()

  if (!cleanEmail) return { error: 'Email wajib diisi' }
  if (cleanName.length < 3) return { error: 'Nama minimal 3 karakter' }
  if (!['dept_head', 'staff'].includes(role)) return { error: 'Role tidak valid' }
  if (!deptId) return { error: 'Departemen wajib dipilih' }

  const admin = createAdminClient()

  const { data: department, error: deptError } = await admin
    .from('departments')
    .select('id')
    .eq('id', deptId)
    .single()
  if (deptError || !department) return { error: 'Departemen tidak ditemukan' }

  const tempPassword = `${crypto.randomUUID()}A1!`
  const { data, error: createError } = await admin.auth.admin.createUser({
    email: cleanEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: cleanName },
  })
  if (createError || !data.user) return { error: createError?.message ?? 'Gagal membuat akun' }

  const { error: profileError } = await admin.from('profiles').insert({
    id: data.user.id,
    full_name: cleanName,
    role,
    dept_id: deptId,
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id)
    return { error: profileError.message }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://monitor-giat.vercel.app'
  const { error: resetError } = await admin.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: `${baseUrl}/auth/callback?next=/update-password`,
  })
  if (resetError) return { error: resetError.message }

  revalidatePath('/admin')
  return {}
}

export async function resetUserPassword(userId: string): Promise<{ error?: string }> {
  const auth = await requireKadiv()
  if (auth.error) return auth

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
