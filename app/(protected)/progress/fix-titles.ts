'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface FixResult {
  proposals: number
  items: number
  error?: string
}

/**
 * Perbaikan sekali jalan: judul tugas lama yang masih berupa kalimat perintah
 * ("Agar dikoordinasikan", "Agar ditangani segera", ...) diganti dengan perihal suratnya.
 * Hanya untuk Kadiv. Aman dijalankan berulang: hanya menyentuh judul yang berawalan "Agar ".
 */
export async function syncTitlesFromPerihal(): Promise<FixResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { proposals: 0, items: 0, error: 'Sesi tidak ditemukan' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'kadiv') return { proposals: 0, items: 0, error: 'Hanya Kepala Divisi' }

  const { data: rows, error } = await supabase
    .from('progress_proposals')
    .select('id, judul, perihal, instruksi')
    .ilike('judul', 'Agar %')
  if (error) return { proposals: 0, items: 0, error: error.message }

  let proposals = 0
  let items = 0
  for (const row of rows ?? []) {
    const r = row as { id: string; judul: string; perihal: string | null; instruksi: string | null }
    const perihal = String(r.perihal ?? '').trim()
    if (!perihal) continue

    // Kalimat perintah Kadiv jangan hilang — pindahkan ke instruksi agar jejak disposisi tetap utuh
    const instruksi = [r.judul, String(r.instruksi ?? '').trim()].filter(Boolean).join(' — ')

    const { error: pErr } = await supabase
      .from('progress_proposals')
      .update({ judul: perihal, instruksi })
      .eq('id', r.id)
    if (pErr) return { proposals, items, error: pErr.message }
    proposals += 1

    const { data: updated, error: iErr } = await supabase
      .from('progress_items')
      .update({ title: perihal })
      .eq('proposal_id', r.id)
      .ilike('title', 'Agar %')
      .select('id')
    if (iErr) return { proposals, items, error: iErr.message }
    items += updated?.length ?? 0
  }

  revalidatePath('/progress')
  revalidatePath('/usulan')
  revalidatePath('/dashboard')
  return { proposals, items }
}