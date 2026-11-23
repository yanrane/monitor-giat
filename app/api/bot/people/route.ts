import { NextRequest, NextResponse } from 'next/server'
import { authorizeBotToken, recordBotAccess } from '@/lib/bot-access'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/bot/people
 * Profil aktif non-Kadiv untuk memetakan penerima disposisi ke PIC.
 * Sengaja tanpa nomor telepon (docs/bot-access.md §4).
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeBotToken(request)
  if (auth.error || !auth.token) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: auth.status ?? 401 })
  }

  const { data, error } = await createAdminClient()
    .from('profiles')
    .select('id, full_name, departments(name)')
    .eq('is_active', true)
    .neq('role', 'kadiv')
    .order('full_name')

  if (error) {
    await recordBotAccess(auth.token.id, '/api/bot/people', 'json', false, error.message)
    return NextResponse.json({ error: 'Gagal membaca daftar orang' }, { status: 500 })
  }

  await recordBotAccess(auth.token.id, '/api/bot/people', 'json')
  const rows = (data ?? []) as unknown as { id: string; full_name: string; departments: { name: string } | null }[]
  return NextResponse.json(
    rows.map((p) => ({ id: p.id, nama: p.full_name, bidang: p.departments?.name ?? null })),
    { headers: { 'cache-control': 'no-store' } }
  )
}
