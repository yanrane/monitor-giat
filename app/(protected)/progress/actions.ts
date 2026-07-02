'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils'

// RLS di tabel progress_items yang menegakkan izin:
// insert/delete = kadiv, update = kadiv atau PIC.

export async function addProgressItem(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const title = String(formData.get('title') ?? '').trim()
  const picId = String(formData.get('pic_id') ?? '')
  const targetDate = String(formData.get('target_date') ?? '')
  if (!title || !picId || !targetDate) return

  const { error } = await supabase.from('progress_items').insert({
    title,
    pic_id: picId,
    target_date: targetDate,
    created_by: user.id,
  })

  // Notifikasi lonceng ke PIC (insert notifications hanya bisa via service_role).
  // Gagal notif tidak boleh menggagalkan penambahan item.
  if (!error && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await createAdminClient().from('notifications').insert({
      user_id: picId,
      title: 'Tugas baru dari Kepala Divisi',
      message: `Anda ditugaskan: ${title} — target selesai ${formatDate(targetDate)}. Cek menu Monitor Progress.`,
      type: 'status_change',
    })
  }

  revalidatePath('/progress')
}

export async function toggleProgressItem(id: string, currentStatus: string) {
  const supabase = await createClient()
  const done = currentStatus !== 'done'
  const { data: updated } = await supabase.from('progress_items').update({
    status: done ? 'done' : 'pending',
    completed_at: done ? new Date().toISOString() : null,
  }).eq('id', id)
    .select('title, target_date, created_by, pic_id, pic:profiles!progress_items_pic_id_fkey(full_name)')
    .single()

  // Lapor balik ke pembuat (Kadiv) saat PIC menandai selesai
  if (done && updated && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user && user.id !== updated.created_by) {
      const picName = (updated.pic as unknown as { full_name: string } | null)?.full_name ?? 'PIC'
      const onTime = new Date().toLocaleDateString('sv-SE') <= updated.target_date
      await createAdminClient().from('notifications').insert({
        user_id: updated.created_by,
        title: `Pekerjaan selesai (${onTime ? 'tepat waktu' : 'terlambat'})`,
        message: `"${updated.title}" ditandai selesai oleh ${picName}.`,
        type: 'status_change',
      })
    }
  }

  revalidatePath('/progress')
}

export async function updateProgressTarget(id: string, targetDate: string) {
  if (!targetDate) return
  const supabase = await createClient()
  const { data: updated } = await supabase.from('progress_items')
    .update({ target_date: targetDate })
    .eq('id', id)
    .select('title, pic_id')
    .single()

  // Kabari PIC bahwa target pekerjaannya direvisi
  if (updated && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await createAdminClient().from('notifications').insert({
      user_id: updated.pic_id,
      title: 'Target pekerjaan direvisi',
      message: `Target selesai "${updated.title}" diubah menjadi ${formatDate(targetDate)}.`,
      type: 'status_change',
    })
  }

  revalidatePath('/progress')
}

export async function deleteProgressItem(id: string) {
  const supabase = await createClient()
  await supabase.from('progress_items').delete().eq('id', id)
  revalidatePath('/progress')
}
