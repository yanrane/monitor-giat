'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { wibDateStr } from '@/lib/utils'
import { notifyNewItems } from '../progress/create-items'

export interface BulkRow {
  id: string
  judul: string
  picIds: string[]
  targetDate: string
}

export interface BulkResult {
  ok: number
  failed: { id: string; teoRef?: string; error: string }[]
}

async function requireKadiv() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Hanya Kepala Divisi')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'kadiv') throw new Error('Hanya Kepala Divisi')
  return supabase
}

function refreshAll() {
  revalidatePath('/usulan')
  revalidatePath('/progress')
  revalidatePath('/dashboard')
  revalidatePath('/calendar')
}

/**
 * Setujui beberapa usulan sekaligus.
 * Setiap usulan tetap diproses lewat approve_proposal (atomik per usulan, migration 018):
 * satu usulan gagal tidak membatalkan yang lain, dan hasilnya dilaporkan per baris.
 */
export async function bulkApprove(rows: BulkRow[]): Promise<BulkResult> {
  const supabase = await requireKadiv()
  const today = wibDateStr()
  const failed: BulkResult['failed'] = []
  const approved: { judul: string; picIds: string[]; targetDate: string }[] = []

  if (!rows.length) return { ok: 0, failed: [{ id: '-', error: 'Tidak ada usulan yang dipilih' }] }

  // Validasi PIC sekali untuk semua baris
  const wanted = [...new Set(rows.flatMap((r) => r.picIds))]
  const { data: validPic } = await supabase
    .from('profiles').select('id').in('id', wanted).eq('is_active', true).neq('role', 'kadiv')
  const validSet = new Set((validPic ?? []).map((x) => x.id as string))

  for (const row of rows) {
    const judul = row.judul.trim()
    if (!judul || judul.length > 200) {
      failed.push({ id: row.id, error: 'Judul wajib diisi (maks 200 karakter)' })
      continue
    }
    const picIds = [...new Set(row.picIds)]
    if (!picIds.length) {
      failed.push({ id: row.id, error: 'Belum ada PIC' })
      continue
    }
    if (picIds.some((id) => !validSet.has(id))) {
      failed.push({ id: row.id, error: 'Ada PIC yang tidak aktif' })
      continue
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.targetDate) || row.targetDate < today) {
      failed.push({ id: row.id, error: 'Tenggat tidak boleh sebelum hari ini' })
      continue
    }

    const { data: claimed, error } = await supabase.rpc('approve_proposal', {
      p_id: row.id, p_judul: judul, p_pic_ids: picIds, p_target: row.targetDate,
    })
    if (error) {
      failed.push({ id: row.id, error: error.message })
      continue
    }
    if (claimed !== 1) {
      failed.push({ id: row.id, error: 'Sudah diputus sebelumnya' })
      continue
    }
    approved.push({ judul, picIds, targetDate: row.targetDate })
  }

  // Notifikasi lonceng per PIC (gagal notif tidak membatalkan persetujuan)
  for (const item of approved) {
    await notifyNewItems({ title: item.judul, picIds: item.picIds, targetDate: item.targetDate })
  }

  refreshAll()
  return { ok: approved.length, failed }
}

/** Tolak beberapa usulan sekaligus, dengan satu alasan yang sama. */
export async function bulkReject(ids: string[], reason: string): Promise<BulkResult> {
  const supabase = await requireKadiv()
  const alasan = reason.trim().slice(0, 300)
  const failed: BulkResult['failed'] = []
  let ok = 0
  const user = (await supabase.auth.getUser()).data.user

  for (const id of ids) {
    const { data: claimed, error } = await supabase
      .from('progress_proposals')
      .update({
        status: 'ditolak',
        decided_by: user?.id,
        decided_at: new Date().toISOString(),
        alasan_tolak: alasan || null,
      })
      .eq('id', id)
      .eq('status', 'menunggu')
      .select('id')
    if (error) { failed.push({ id, error: error.message }); continue }
    if (!claimed?.length) { failed.push({ id, error: 'Sudah diputus sebelumnya' }); continue }
    ok += 1
  }

  refreshAll()
  return { ok, failed }
}