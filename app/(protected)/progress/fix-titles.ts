'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface FixResult {
  proposals: number
  items: number
  remaining: number
  error?: string
}

const CHUNK = 8

/**
 * Perbaikan judul tugas lama: judul yang masih berupa kalimat perintah ("Agar …")
 * diganti perihal suratnya; kalimat perintah dipindahkan ke kolom instruksi
 * supaya jejak disposisi tidak hilang.
 *
 * Dijalankan per potongan (CHUNK) dengan permintaan paralel agar tidak kena batas
 * waktu serverless. Idempoten: aman dipanggil berulang sampai `remaining` = 0.
 */
export async function syncTitlesFromPerihal(): Promise<FixResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { proposals: 0, items: 0, remaining: -1, error: 'Sesi tidak ditemukan' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'kadiv') return { proposals: 0, items: 0, remaining: -1, error: 'Hanya Kepala Divisi' }

  const { data: rows, error } = await supabase
    .from('progress_proposals')
    .select('id, judul, perihal, instruksi')
    .ilike('judul', 'Agar %')
    .limit(CHUNK)
  if (error) return { proposals: 0, items: 0, remaining: -1, error: error.message }

  const batch = (rows ?? [])
    .map((row) => {
      const r = row as { id: string; judul: string; perihal: string | null; instruksi: string | null }
      const perihal = String(r.perihal ?? '').trim()
      if (!perihal) return null
      const instruksi = [r.judul, String(r.instruksi ?? '').trim()].filter(Boolean).join(' — ')
      return { id: r.id, judul: perihal, instruksi }
    })
    .filter((x): x is { id: string; judul: string; instruksi: string } => x !== null)

  if (!batch.length) {
    const { count } = await supabase
      .from('progress_proposals').select('id', { count: 'exact', head: true }).ilike('judul', 'Agar %')
    return { proposals: 0, items: 0, remaining: count ?? 0, error: count ? 'Ada usulan tanpa perihal — perlu diisi manual' : undefined }
  }

  const results = await Promise.all([
    ...batch.map((b) =>
      supabase.from('progress_proposals').update({ judul: b.judul, instruksi: b.instruksi }).eq('id', b.id),
    ),
    ...batch.map((b) =>
      supabase
        .from('progress_items')
        .update({ title: b.judul })
        .eq('proposal_id', b.id)
        .ilike('title', 'Agar %')
        .select('id'),
    ),
  ])

  const failed = results.find((r) => r.error)
  if (failed?.error) return { proposals: 0, items: 0, remaining: -1, error: failed.error.message }

  const itemResults = results.slice(batch.length) as { data: { id: string }[] | null }[]
  const items = itemResults.reduce((n, r) => n + (r.data?.length ?? 0), 0)

  const { count } = await supabase
    .from('progress_proposals').select('id', { count: 'exact', head: true }).ilike('judul', 'Agar %')

  revalidatePath('/progress')
  revalidatePath('/usulan')
  revalidatePath('/dashboard')
  return { proposals: batch.length, items, remaining: count ?? 0 }
}