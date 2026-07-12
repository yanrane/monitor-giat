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

// Pekerjaan tim: satu centang menyelesaikan semua baris PIC sekaligus.
// RLS update hanya izinkan baris milik sendiri → anggota tim yang mencentang
// cuma meng-update barisnya, baris rekan diam-diam tertinggal (grup tampil
// belum selesai). Solusi: otorisasi dicek di sini, update se-grup via service_role.
export async function toggleProgressItem(ids: string[], currentStatus: string) {
  if (ids.length === 0) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: rows } = await supabase.from('progress_items')
    .select('title, target_date, created_by, pic_id')
    .in('id', ids)
  if (!rows || rows.length === 0) return

  const { data: me } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const isTeamMember = rows.some((r) => r.pic_id === user.id)
  if (me?.role !== 'kadiv' && !isTeamMember) return

  const done = currentStatus !== 'done'
  const admin = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase
  if (done) {
    // Hanya baris yang belum selesai — baris yang sudah done (centang lama
    // per-orang) tetap pegang completed_at aslinya
    await admin.from('progress_items').update({
      status: 'done',
      completed_at: new Date().toISOString(),
    }).in('id', ids).neq('status', 'done')
  } else {
    await admin.from('progress_items').update({
      status: 'pending',
      completed_at: null,
    }).in('id', ids)
  }

  // Lapor balik ke pembuat (Kadiv) saat pekerjaan ditandai selesai
  const first = rows[0]
  if (done && first && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    if (user && user.id !== first.created_by) {
      const { data: toggler } = await supabase
        .from('profiles').select('full_name').eq('id', user.id).single()
      const onTime = new Date().toLocaleDateString('sv-SE') <= first.target_date
      await createAdminClient().from('notifications').insert({
        user_id: first.created_by,
        title: `Pekerjaan selesai (${onTime ? 'tepat waktu' : 'terlambat'})`,
        message: `"${first.title}" ditandai selesai oleh ${toggler?.full_name ?? 'PIC'}.`,
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
