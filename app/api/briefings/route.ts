import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { type BriefingViralNews, type BriefingEvaluation } from '@/lib/types'

// ── Request body type ──────────────────────────────────
interface SaveBriefingRequest {
  briefing_date: string               // "2026-05-31"
  viral_news: BriefingViralNews[]
  evaluations: BriefingEvaluation[]
  overall_insight: string
}

// ── POST: save briefing + create notifications ────────
export async function POST(request: NextRequest) {
  // Only accept JSON
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return NextResponse.json(
      { error: 'Content-Type must be application/json' },
      { status: 415 }
    )
  }

  let body: SaveBriefingRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  // Validate required fields
  if (!body.briefing_date || !body.overall_insight) {
    return NextResponse.json(
      { error: 'briefing_date and overall_insight are required' },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  // ── 1. Insert briefing ─────────────────────────────
  const { data: briefing, error: insertError } = await supabase
    .from('morning_briefings')
    .insert({
      briefing_date: body.briefing_date,
      viral_news: body.viral_news ?? [],
      evaluations: body.evaluations ?? [],
      overall_insight: body.overall_insight,
      generated_by: 'kevin',
    })
    .select('id, briefing_date')
    .single()

  if (insertError) {
    // Check for duplicate date → update instead
    if (insertError.code === '23505') {
      const { data: updated, error: updateError } = await supabase
        .from('morning_briefings')
        .update({
          viral_news: body.viral_news ?? [],
          evaluations: body.evaluations ?? [],
          overall_insight: body.overall_insight,
          generated_by: 'kevin',
        })
        .eq('briefing_date', body.briefing_date)
        .select('id, briefing_date')
        .single()

      if (updateError) {
        return NextResponse.json(
          { error: `Update failed: ${updateError.message}` },
          { status: 500 }
        )
      }

      await createNotifications(supabase, updated!.id, body)
      return NextResponse.json({
        success: true,
        briefing_id: updated!.id,
        briefing_date: updated!.briefing_date,
        updated: true,
      })
    }

    return NextResponse.json(
      { error: `Insert failed: ${insertError.message}` },
      { status: 500 }
    )
  }

  // ── 2. Create notifications for all users ─────────
  await createNotifications(supabase, briefing!.id, body)

  return NextResponse.json({
    success: true,
    briefing_id: briefing!.id,
    briefing_date: briefing!.briefing_date,
  })
}

// ── Helper: create in-app notifications ────────────────
async function createNotifications(
  supabase: ReturnType<typeof createAdminClient>,
  briefingId: string,
  body: SaveBriefingRequest
) {
  // Get all active users (exclude kadiv since Kevin reports directly to them)
  const { data: users } = await supabase
    .from('profiles')
    .select('id')
    .neq('role', 'kadiv')

  if (!users || users.length === 0) return

  const insightPreview = body.overall_insight.length > 200
    ? body.overall_insight.slice(0, 200) + '…'
    : body.overall_insight

  // Build department highlights from evaluations
  const deptHighlights = body.evaluations
    .slice(0, 3)
    .map((e) => `• ${e.department}: ${e.recommendation}`)
    .join('\n')

  const notifications = users.map((u) => ({
    user_id: u.id,
    title: `📋 Briefing Pagi — ${body.briefing_date}`,
    message: `Ringkasan harian untuk ${body.briefing_date} sudah tersedia.\n\n${insightPreview}\n\n${deptHighlights}`,
    type: 'briefing',
    is_read: false,
  }))

  const { error: notifError } = await supabase
    .from('notifications')
    .insert(notifications)

  if (notifError) {
    console.error('[briefings] Failed to create notifications:', notifError.message)
  }
}

// ── GET: fetch briefings ────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get('limit')) || 7, 30)
  const date = searchParams.get('date')

  const supabase = createAdminClient()

  let query = supabase
    .from('morning_briefings')
    .select('*')
    .order('briefing_date', { ascending: false })
    .limit(limit)

  if (date) {
    query = query.eq('briefing_date', date)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ data })
}
