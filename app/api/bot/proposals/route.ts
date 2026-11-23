import { NextRequest, NextResponse } from 'next/server'
import { authorizeBotProposer, recordBotAccess, type BotTokenRow } from '@/lib/bot-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { isIsoDate, parseProposalInput, parseTeoRef } from '@/lib/proposals'
import { wibDateStr } from '@/lib/utils'
import type { ProposalStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

const ENDPOINT = '/api/bot/proposals'
const STATUSES: ProposalStatus[] = ['menunggu', 'disetujui', 'ditolak']

// Usulan hanya untuk agent pengusul (KEVIN); bot baca-saja lain tidak melihat judul disposisi
async function authorizeProposer(request: NextRequest, format: string) {
  const auth = await authorizeBotProposer(request, ENDPOINT, format)
  if (auth.error || !auth.token) {
    return { fail: NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: auth.status ?? 401 }) }
  }
  return { token: auth.token as BotTokenRow }
}

/**
 * POST /api/bot/proposals — kirim usulan item Monitor Progress dari disposisi TEO.
 * Idempoten per teo_ref: usulan yang sudah ada dikembalikan apa adanya (200), tidak ditimpa.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeProposer(request, 'post')
  if (auth.fail) return auth.fail
  const token = auth.token
  const log = (ok: boolean, note: string | null = null) => recordBotAccess(token.id, ENDPOINT, 'post', ok, note)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    await log(false, 'JSON tidak valid')
    return NextResponse.json({ errors: ['body: JSON tidak valid'] }, { status: 400 })
  }

  const teoRef = parseTeoRef(body)
  if (!teoRef) {
    await log(false, 'teo_ref tidak valid')
    return NextResponse.json({ errors: ['teo_ref: wajib diisi, maksimal 100 karakter'] }, { status: 400 })
  }

  const admin = createAdminClient()
  const origin = new URL(request.url).origin
  const reply = (row: { id: string; status: string }, status: number) =>
    NextResponse.json({ id: row.id, status: row.status, url: `${origin}/usulan/${row.id}` }, { status })
  const findExisting = () =>
    admin.from('progress_proposals').select('id, status').eq('teo_ref', teoRef).maybeSingle()

  // Idempoten dulu (spec §6.2): teo_ref yang sudah ada → 200 apa adanya, sebelum validasi penuh
  const existing = await findExisting()
  if (existing.data) {
    await log(true, 'teo_ref sudah ada')
    return reply(existing.data, 200)
  }

  const { data: people } = await admin.from('profiles').select('id').eq('is_active', true).neq('role', 'kadiv')
  const parsed = parseProposalInput(body, {
    today: wibDateStr(),
    activePicIds: new Set((people ?? []).map((p) => p.id as string)),
  })
  if (!parsed.ok) {
    await log(false, parsed.errors.join('; ').slice(0, 500))
    return NextResponse.json({ errors: parsed.errors }, { status: 400 })
  }

  const inserted = await admin
    .from('progress_proposals')
    .insert({ ...parsed.value, proposed_by_token: token.id })
    .select('id, status')
    .single()

  if (inserted.error) {
    // Dua agent mengirim teo_ref yang sama bersamaan → UNIQUE menang, kembalikan yang tersimpan
    if (inserted.error.code === '23505') {
      const again = await findExisting()
      if (again.data) {
        await log(true, 'teo_ref balapan')
        return reply(again.data, 200)
      }
    }
    await log(false, inserted.error.message)
    return NextResponse.json({ error: 'Gagal menyimpan usulan' }, { status: 500 })
  }

  await log(true)
  return reply(inserted.data, 201)
}

/**
 * GET /api/bot/proposals?status=menunggu|disetujui|ditolak&sejak=YYYY-MM-DD&diputus_sejak=YYYY-MM-DD
 * (sejak = tanggal usulan dibuat; diputus_sejak = tanggal Kadiv memutus, urut terbaru)
 * Keputusan Kadiv atas usulan, supaya KEVIN tahu kapan mengirim penugasan ke PIC.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeProposer(request, 'json')
  if (auth.fail) return auth.fail
  const token = auth.token

  const params = new URL(request.url).searchParams
  const status = params.get('status')
  const sejak = params.get('sejak')
  // diputus_sejak: untuk KEVIN mengambil keputusan baru — usulan lama yang baru diputus tetap terambil
  const diputusSejak = params.get('diputus_sejak')
  if (status && !STATUSES.includes(status as ProposalStatus)) {
    return NextResponse.json({ error: `status harus salah satu dari ${STATUSES.join(', ')}` }, { status: 400 })
  }
  for (const [name, value] of [['sejak', sejak], ['diputus_sejak', diputusSejak]] as const) {
    if (value && !isIsoDate(value)) {
      return NextResponse.json({ error: `${name} harus tanggal YYYY-MM-DD yang valid` }, { status: 400 })
    }
  }

  const admin = createAdminClient()
  let query = admin
    .from('progress_proposals')
    .select('id, teo_ref, status, judul, pic_ids, target_date, decided_at, alasan_tolak, created_at')
    .order(diputusSejak ? 'decided_at' : 'created_at', { ascending: false })
    .limit(100)
  if (status) query = query.eq('status', status)
  if (sejak) query = query.gte('created_at', `${sejak}T00:00:00+07:00`)
  if (diputusSejak) query = query.gte('decided_at', `${diputusSejak}T00:00:00+07:00`)

  const { data, error } = await query
  if (error) {
    await recordBotAccess(token.id, ENDPOINT, 'json', false, error.message)
    return NextResponse.json({ error: 'Gagal membaca usulan' }, { status: 500 })
  }

  const rows = data ?? []
  const ids = [...new Set(rows.flatMap((r) => r.pic_ids as string[]))]
  const { data: people } = ids.length
    ? await admin.from('profiles').select('id, full_name').in('id', ids)
    : { data: [] as { id: string; full_name: string }[] }
  const nameOf = new Map((people ?? []).map((p) => [p.id as string, p.full_name as string]))
  const origin = new URL(request.url).origin

  await recordBotAccess(token.id, ENDPOINT, 'json')
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      teo_ref: r.teo_ref,
      status: r.status,
      judul: r.judul,
      pic: (r.pic_ids as string[]).map((id) => nameOf.get(id) ?? 'PIC tidak dikenal'),
      target_date: r.target_date,
      decided_at: r.decided_at,
      alasan_tolak: r.alasan_tolak,
      url: `${origin}/usulan/${r.id}`,
    })),
    { headers: { 'cache-control': 'no-store' } }
  )
}
