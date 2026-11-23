'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { wibDateStr } from '@/lib/utils'
import { notifyNewItems } from '../../progress/create-items'

async function requireKadiv() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Hanya Kepala Divisi' as const }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'kadiv') return { error: 'Hanya Kepala Divisi' as const }
  return { supabase, user }
}

function refresh(id: string) {
  revalidatePath(`/usulan/${id}`)
  revalidatePath('/progress')
  revalidatePath('/dashboard')
}

// Setujui usulan: klaim dulu (hanya bila masih 'menunggu'), baru buat item per PIC.
// Klik ganda / dua tab → klaim kedua tidak mengenai baris apa pun → item tidak dobel.
export async function approveProposal(id: string, formData: FormData): Promise<{ error?: string }> {
  const auth = await requireKadiv()
  if ('error' in auth) return { error: auth.error }
  const { supabase, user } = auth

  const title = String(formData.get('title') ?? '').trim()
  const picIds = [...new Set(formData.getAll('pic_id').map(String).filter(Boolean))]
  const targetDate = String(formData.get('target_date') ?? '')
  if (!title || title.length > 200) return { error: 'Judul wajib diisi (maks 200 karakter)' }
  if (picIds.length === 0) return { error: 'Pilih minimal satu PIC' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || targetDate < wibDateStr()) {
    return { error: 'Tenggat tidak boleh sebelum hari ini' }
  }

  const { data: valid } = await supabase
    .from('profiles').select('id').in('id', picIds).eq('is_active', true).neq('role', 'kadiv')
  if ((valid ?? []).length !== picIds.length) return { error: 'Ada PIC yang tidak aktif atau tidak dikenal' }

  // Klaim + buat item dalam satu transaksi DB (approve_proposal, migration 018):
  // gagal di tengah → semua batal; 0 → sudah diputus (klik ganda / tab kedua)
  const { data: claimed, error } = await supabase.rpc('approve_proposal', {
    p_id: id, p_judul: title, p_pic_ids: picIds, p_target: targetDate,
  })
  if (error) return { error: `Gagal menyetujui: ${error.message}` }
  if (claimed !== 1) return { error: 'Usulan sudah diputus' }

  await notifyNewItems({ title, picIds, targetDate })
  refresh(id)
  return {}
}

export async function rejectProposal(id: string, formData: FormData): Promise<{ error?: string }> {
  const auth = await requireKadiv()
  if ('error' in auth) return { error: auth.error }
  const { supabase, user } = auth

  const reason = String(formData.get('alasan_tolak') ?? '').trim()
  if (reason.length > 300) return { error: 'Alasan maksimal 300 karakter' }

  const { data: claimed, error } = await supabase
    .from('progress_proposals')
    .update({ status: 'ditolak', decided_by: user.id, decided_at: new Date().toISOString(), alasan_tolak: reason || null })
    .eq('id', id)
    .eq('status', 'menunggu')
    .select('id')
  if (error) return { error: error.message }
  if (!claimed?.length) return { error: 'Usulan sudah diputus' }

  refresh(id)
  return {}
}
