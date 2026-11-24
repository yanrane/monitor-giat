import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authorizeBotProposer } from '@/lib/bot-access'

/**
 * Perbaikan sekali pakai (sementara): judul usulan/item yang masih berupa kalimat
 * perintah ("Agar …") diganti perihal suratnya; perintah dipindahkan ke instruksi.
 * Memakai service_role, jadi tidak bergantung pada sesi Kadiv. Token wajib can_propose.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await authorizeBotProposer(request, '/api/bot/fix-titles', 'json')
  if (auth.error || !auth.token) {
    return NextResponse.json({ error: auth.error ?? 'Tidak berwenang' }, { status: auth.status ?? 401 })
  }
  const admin = createAdminClient()
  const { count: proposalsLeft } = await admin
    .from('progress_proposals').select('id', { count: 'exact', head: true }).ilike('judul', 'Agar %')
  const { count: itemsLeft, data: sample } = await admin
    .from('progress_items').select('title').ilike('title', 'Agar %').limit(5)
  return NextResponse.json({ proposalsLeft: proposalsLeft ?? 0, itemsLeft: (sample?.length ?? 0) > 0 ? (itemsLeft ?? -1) : 0, sample })
}

export async function POST(request: Request) {
  const auth = await authorizeBotProposer(request, '/api/bot/fix-titles', 'json')
  if (auth.error || !auth.token) {
    return NextResponse.json({ error: auth.error ?? 'Tidak berwenang' }, { status: auth.status ?? 401 })
  }

  const admin = createAdminClient()
  const { data: rows, error } = await admin
    .from('progress_proposals')
    .select('id, judul, perihal, instruksi')
    .ilike('judul', 'Agar %')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const jobs = (rows ?? []).map(async (row) => {
    const perihal = String(row.perihal ?? '').trim().slice(0, 200)
    if (!perihal) return { ok: false as const, reason: `perihal kosong: ${row.judul}` }
    const instruksi = [row.judul, String(row.instruksi ?? '').trim()].filter(Boolean).join(' — ').slice(0, 1000)

    const { error: pe } = await admin
      .from('progress_proposals')
      .update({ judul: perihal, instruksi })
      .eq('id', row.id)
    if (pe) return { ok: false as const, reason: pe.message }

    const { data: updated, error: ie } = await admin
      .from('progress_items')
      .update({ title: perihal })
      .eq('proposal_id', row.id)
      .select('id')
    if (ie) return { ok: false as const, reason: ie.message }

    return { ok: true as const, items: updated?.length ?? 0 }
  })

  const results = await Promise.all(jobs)
  const proposals = results.filter((r) => r.ok).length
  const items = results.reduce((n, r) => n + (r.ok ? r.items : 0), 0)
  const failures = results.flatMap((r) => (r.ok ? [] : [r.reason]))

  const { count } = await admin
    .from('progress_proposals').select('id', { count: 'exact', head: true }).ilike('judul', 'Agar %')

  return NextResponse.json({ ok: failures.length === 0, proposals, items, remaining: count ?? 0, failures })
}