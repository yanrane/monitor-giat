import { NextRequest, NextResponse } from 'next/server'
import {
  authorizeBotToken,
  buildBotSummary,
  recordBotAccess,
  summaryToText,
} from '@/lib/bot-access'

export const dynamic = 'force-dynamic'

/**
 * GET /api/bot/summary
 * Header : x-bot-token: <token>   (atau ?token=<token>)
 * Query  : format=json|text  (default json)
 *
 * Read-only. Tidak mengubah data apa pun. Dipakai bot (mis. Grok Bot
 * per Kabid) untuk menarik ringkasan progres Monitor Giat.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeBotToken(request)
  if (auth.error || !auth.token) {
    return NextResponse.json({ error: auth.error ?? 'Unauthorized' }, { status: auth.status ?? 401 })
  }

  const format = (new URL(request.url).searchParams.get('format') ?? 'json').toLowerCase()

  try {
    const summary = await buildBotSummary(auth.token)
    await recordBotAccess(auth.token.id, '/api/bot/summary', format)

    if (format === 'text') {
      return new NextResponse(summaryToText(summary), {
        status: 200,
        headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
      })
    }

    return NextResponse.json(summary, { headers: { 'cache-control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal membangun ringkasan'
    await recordBotAccess(auth.token.id, '/api/bot/summary', format, false, message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
