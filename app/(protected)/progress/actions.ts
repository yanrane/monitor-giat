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
  const picIds = formData.getAll('pic_id').map(String).filter(Boolean)
  const targetDate = String(formData.get('target_date') ?? '')
  if (!title || picIds.length === 0 || !targetDate) return

  // Multi-PIC = satu baris per orang, biar ketepatan waktu terukur per PIC
  const { error } = await supabase.from('progress_items').insert(
    picIds.map((picId) => ({
      title,
      pic_id: picId,
      target_date: targetDate,
      created_by: user.id,
    }))
  )

  // Notifikasi lonceng ke tiap PIC (insert notifications hanya bisa via service_role).
  // Gagal notif tidak boleh menggagalkan penambahan item.
  if (!error && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await createAdminClient().from('notifications').insert(
      picIds.map((picId) => ({
        user_id: picId,
        title: 'Tugas baru dari Kepala Divisi',
        message: `Anda ditugaskan: ${title} — target selesai ${formatDate(targetDate)}. Cek menu Monitor Progress.`,
        type: 'status_change',
      }))
    )
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

// ids = semua baris satu pekerjaan (multi-PIC digabung tampil 1 baris)
export async function updateProgressTarget(ids: string[], targetDate: string) {
  if (!targetDate || ids.length === 0) return
  const supabase = await createClient()
  const { data: updated } = await supabase.from('progress_items')
    .update({ target_date: targetDate })
    .in('id', ids)
    .select('title, pic_id')

  // Kabari tiap PIC bahwa target pekerjaannya direvisi
  if (updated && updated.length > 0 && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await createAdminClient().from('notifications').insert(
      updated.map((row) => ({
        user_id: row.pic_id,
        title: 'Target pekerjaan direvisi',
        message: `Target selesai "${row.title}" diubah menjadi ${formatDate(targetDate)}.`,
        type: 'status_change',
      }))
    )
  }

  revalidatePath('/progress')
}

export async function deleteProgressItem(ids: string[]) {
  if (ids.length === 0) return
  const supabase = await createClient()
  await supabase.from('progress_items').delete().in('id', ids)
  revalidatePath('/progress')
}
