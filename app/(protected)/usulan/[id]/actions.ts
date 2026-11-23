'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { wibDateStr } from '@/lib/utils'
import { createProgressItems } from '../../progress/create-items'

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

  const { data: claimed, error: claimError } = await supabase
    .from('progress_proposals')
    .update({
      status: 'disetujui',
      decided_by: user.id,
      decided_at: new Date().toISOString(),
      judul: title,
      pic_ids: picIds,
      target_date: targetDate,
    })
    .eq('id', id)
    .eq('status', 'menunggu')
    .select('id')
  if (claimError) return { error: claimError.message }
  if (!claimed?.length) return { error: 'Usulan sudah diputus' }

  const { error } = await createProgressItems(supabase, {
    title, picIds, targetDate, createdBy: user.id, proposalId: id,
  })
  if (error) {
    // Item gagal dibuat → kembalikan usulan ke antrean supaya bisa dicoba lagi
    await supabase.from('progress_proposals').update({ status: 'menunggu', decided_by: null, decided_at: null }).eq('id', id)
    return { error: `Gagal membuat item: ${error}` }
  }

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
