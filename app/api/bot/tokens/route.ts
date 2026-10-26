import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateToken, hashToken } from '@/lib/bot-access'

/**
 * Manajemen token bot (khusus Kadiv, memakai bearer token Supabase).
 *
 * GET  /api/bot/tokens                 → daftar token (tanpa token asli)
 * POST /api/bot/tokens {label, owner_name, dept_id?, scope?}
 *                                      → buat token baru; token asli HANYA
 *                                        muncul di respons ini, sekali saja
 * POST /api/bot/tokens {action:'revoke', id}
 * POST /api/bot/tokens {action:'activate', id}
 */

async function requireKadiv(request: NextRequest) {
  const auth = request.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : ''
  if (!token) return { error: NextResponse.json({ error: 'Missing bearer token' }, { status: 401 }) }

  const admin = createAdminClient()
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData.user) {
    return { error: NextResponse.json({ error: 'Invalid bearer token' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', userData.user.id)
    .single()

  if (profileError || profile?.role !== 'kadiv') {
    return { error: NextResponse.json({ error: 'Kadiv access required' }, { status: 403 }) }
  }

  return { admin, profile }
}

export async function GET(request: NextRequest) {
  const guard = await requireKadiv(request)
  if ('error' in guard) return guard.error

  const { data, error } = await guard.admin
    .from('bot_tokens')
    .select('id, label, owner_name, dept_id, token_prefix, scope, can_read, can_write, is_active, created_at, last_used_at, request_count')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tokens: data ?? [] })
}

export async function POST(request: NextRequest) {
  const guard = await requireKadiv(request)
  if ('error' in guard) return guard.error

  const { admin, profile } = guard
  const body = await request.json().catch(() => ({}) as Record<string, unknown>)
  const action = typeof body.action === 'string' ? body.action : 'create'

  if (action === 'revoke' || action === 'activate') {
    const id = typeof body.id === 'string' ? body.id : ''
    if (!id) return NextResponse.json({ error: 'id wajib diisi' }, { status: 400 })

    const { data, error } = await admin
      .from('bot_tokens')
      .update({ is_active: action === 'activate' })
      .eq('id', id)
      .select('id, label, is_active')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, token: data })
  }

  const label = typeof body.label === 'string' ? body.label.trim() : ''
  if (!label) return NextResponse.json({ error: 'label wajib diisi' }, { status: 400 })

  const scope = body.scope === 'dept' ? 'dept' : 'all'
  const deptId = typeof body.dept_id === 'string' && body.dept_id ? body.dept_id : null
  if (scope === 'dept' && !deptId) {
    return NextResponse.json({ error: 'scope dept butuh dept_id' }, { status: 400 })
  }

  const raw = generateToken()
  const { data, error } = await admin
    .from('bot_tokens')
    .insert({
      label,
      owner_name: typeof body.owner_name === 'string' ? body.owner_name : null,
      dept_id: deptId,
      token_hash: hashToken(raw),
      token_prefix: raw.slice(0, 8),
      scope,
      can_read: true,
      can_write: false,
      is_active: true,
    })
    .select('id, label, owner_name, token_prefix, scope, is_active, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    token: data,
    token_plaintext: raw,
    warning: 'Simpan token ini sekarang — tidak bisa ditampilkan lagi.',
    dibuat_oleh: profile.full_name,
  })
}
