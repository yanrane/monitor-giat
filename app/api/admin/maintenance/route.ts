import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const QA_EA_TINS_ID = '8199df4b-f312-4726-a3a6-34db42b68ec4'
const QA_EA_TINS_FIXED_START = '2026-05-10T09:00:00+00:00'
const ADE_FULL_NAME = 'Ade Trisnani Wijaya'

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

export async function POST(request: NextRequest) {
  const guard = await requireKadiv(request)
  if ('error' in guard) return guard.error

  const { admin, profile: kadivProfile } = guard
  const body = await request.json().catch(() => ({}))
  const actions = Array.isArray(body.actions) ? body.actions : []
  const results: Record<string, unknown> = {}

  if (actions.includes('fix_qa_ea_tins_date')) {
    const { data, error } = await admin
      .from('activities')
      .update({ start_date: QA_EA_TINS_FIXED_START })
      .eq('id', QA_EA_TINS_ID)
      .select('id, title, start_date, end_date')
      .single()

    results.fix_qa_ea_tins_date = error
      ? { ok: false, error: error.message }
      : { ok: true, activity: data }
  }

  if (actions.includes('remove_ade_trisnani_wijaya')) {
    const { data: ade, error: adeError } = await admin
      .from('profiles')
      .select('id, full_name, role, dept_id')
      .eq('full_name', ADE_FULL_NAME)
      .single()

    if (adeError || !ade) {
      results.remove_ade_trisnani_wijaya = { ok: false, error: adeError?.message ?? 'User not found' }
    } else {
      // Important: do NOT delete historical reports/logs/activities.
      // Ade has moved division, so we only remove her from active Legal membership.
      // Historical records should remain auditable.
      const profileDeactivate = await admin
        .from('profiles')
        .update({ is_active: false, dept_id: null })
        .eq('id', ade.id)
        .select('id, full_name, is_active, dept_id')

      results.remove_ade_trisnani_wijaya = {
        ok: !profileDeactivate.error,
        mode: 'soft_deactivate_only',
        preserved_history: true,
        deleted_daily_logs: 0,
        deleted_profiles: 0,
        auth_user_deleted: false,
        errors: {
          profile: profileDeactivate.error?.message ?? null,
        },
        profile: profileDeactivate.data?.[0] ?? null,
      }
    }
  }

  return NextResponse.json({ ok: true, results })
}
