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
      const activityTransfer = await admin
        .from('activities')
        .update({ created_by: kadivProfile.id })
        .eq('created_by', ade.id)
        .select('id')

      const dailyLogDelete = await admin
        .from('daily_logs')
        .delete()
        .eq('user_id', ade.id)
        .select('id')

      const profileDelete = await admin
        .from('profiles')
        .delete()
        .eq('id', ade.id)
        .select('id, full_name')

      const authDelete = await admin.auth.admin.deleteUser(ade.id)

      results.remove_ade_trisnani_wijaya = {
        ok: !activityTransfer.error && !dailyLogDelete.error && !profileDelete.error && !authDelete.error,
        transferred_activities: activityTransfer.data?.length ?? 0,
        deleted_daily_logs: dailyLogDelete.data?.length ?? 0,
        deleted_profiles: profileDelete.data?.length ?? 0,
        auth_user_deleted: !authDelete.error,
        errors: {
          activities: activityTransfer.error?.message ?? null,
          daily_logs: dailyLogDelete.error?.message ?? null,
          profile: profileDelete.error?.message ?? null,
          auth: authDelete.error?.message ?? null,
        },
      }
    }
  }

  return NextResponse.json({ ok: true, results })
}
