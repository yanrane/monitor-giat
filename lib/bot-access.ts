import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { wibDateStr } from '@/lib/utils'

/**
 * Lapisan akses bot read-only untuk Monitor Giat.
 *
 * Bot (mis. Grok Bot per Kabid) tidak login sebagai manusia. Mereka
 * memegang satu token per bot dan memanggil:
 *   GET /api/bot/summary          (header: x-bot-token)  → JSON
 *   GET /api/bot/summary?format=text                     → teks siap kirim
 *   GET /bot-view?token=...                              → halaman read-only
 *
 * Token disimpan hanya dalam bentuk sha256 di tabel bot_tokens.
 */

export const STALE_WARNING_DAYS = 7
export const STALE_CRITICAL_DAYS = 14

export interface BotTokenRow {
  id: string
  label: string
  owner_name: string | null
  dept_id: string | null
  scope: 'all' | 'dept'
  can_read: boolean
  can_write: boolean
  is_active: boolean
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex')
}

export function generateToken(prefix = 'mgb'): string {
  const raw = crypto.randomBytes(32).toString('base64url')
  return `${prefix}_${raw}`
}

export function extractToken(request: Request): string {
  const header = request.headers.get('x-bot-token')
  if (header) return header.trim()
  const auth = request.headers.get('authorization') ?? ''
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim()
  const url = new URL(request.url)
  return (url.searchParams.get('token') ?? '').trim()
}

export interface BotAuthResult {
  token?: BotTokenRow
  error?: string
  status?: number
}

export async function authorizeBotToken(request: Request): Promise<BotAuthResult> {
  const raw = extractToken(request)
  if (!raw) return { error: 'Token bot tidak ada', status: 401 }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('bot_tokens')
    .select('id, label, owner_name, dept_id, scope, can_read, can_write, is_active')
    .eq('token_hash', hashToken(raw))
    .maybeSingle()

  if (error || !data) return { error: 'Token bot tidak dikenal', status: 401 }
  if (!data.is_active) return { error: 'Token bot sudah dicabut', status: 403 }
  if (!data.can_read) return { error: 'Token bot tanpa izin baca', status: 403 }

  return { token: data as BotTokenRow }
}

export async function recordBotAccess(
  tokenId: string,
  endpoint: string,
  format: string | null,
  ok = true,
  note: string | null = null
) {
  const admin = createAdminClient()
  await admin.from('bot_access_logs').insert({ token_id: tokenId, endpoint, format, ok, note })
  const { data } = await admin.from('bot_tokens').select('request_count').eq('id', tokenId).single()
  await admin
    .from('bot_tokens')
    .update({
      last_used_at: new Date().toISOString(),
      request_count: (data?.request_count ?? 0) + 1,
    })
    .eq('id', tokenId)
}

// ---------------------------------------------------------------
// Ringkasan lintas bidang
// ---------------------------------------------------------------

interface DeptRow { id: string; name: string }
interface ProfileRow { id: string; full_name: string; role: string; dept_id: string | null; is_active: boolean }
interface ActivityRow {
  id: string; dept_id: string; title: string; status: string
  priority: string | null; control_status: string | null
  blocker: string | null; next_action: string | null; next_action_due_date: string | null
  pic_id: string | null; end_date: string; last_substantive_update_at: string | null; updated_at: string
}
interface ProgressItemRow {
  id: string; title: string; pic_id: string; target_date: string; status: string; updated_at: string
}
interface DailyLogRow { user_id: string; log_date: string; created_at: string; content?: string }

export interface BotSummary {
  generated_at: string
  timezone: string
  tanggal_wib: string
  bot: { label: string; pemilik: string | null; cakupan: string }
  aturan: { stale_peringatan_hari: number; stale_kritis_hari: number }
  ringkasan: {
    aktivitas_terbuka: number
    aktivitas_selesai: number
    butuh_keputusan_kadiv: number
    terhambat: number
    progres_terlambat: number
    log_hari_ini_sudah: number
    log_hari_ini_belum: number
  }
  bidang: Array<{
    nama: string
    aktivitas: Record<string, number>
    prioritas_p1: number
    butuh_perhatian: Array<{
      judul: string
      pic: string | null
      status: string
      prioritas: string | null
      status_kendali: string | null
      hari_tanpa_update: number | null
      next_action: string | null
      tenggat_next_action: string | null
      blocker: string | null
    }>
    progres_terlambat: Array<{
      judul: string
      pic: string
      target: string
      hari_terlambat: number
      rekor_terakhir_diubah: string
    }>
  }>
  personel: {
    belum_log_hari_ini: string[]
    sudah_log_hari_ini: string[]
  }
}

function daysBetween(aWib: string, bWib: string): number {
  return Math.round((Date.parse(bWib) - Date.parse(aWib)) / 86400000)
}

function countBy<T>(rows: T[], key: (r: T) => string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows) {
    const k = key(r)
    out[k] = (out[k] ?? 0) + 1
  }
  return out
}

export async function buildBotSummary(token: BotTokenRow): Promise<BotSummary> {
  const admin = createAdminClient()
  const today = wibDateStr()

  const [deptRes, profRes] = await Promise.all([
    admin.from('departments').select('id, name'),
    admin.from('profiles').select('id, full_name, role, dept_id, is_active'),
  ])
  const departments = (deptRes.data ?? []) as DeptRow[]
  const profiles = (profRes.data ?? []) as ProfileRow[]
  const deptName = new Map(departments.map((d) => [d.id, d.name]))
  const personName = new Map(profiles.map((p) => [p.id, p.full_name]))
  const active = profiles.filter((p) => p.is_active !== false)

  // Paging aman untuk semua tabel (PostgREST maksimum 1000 baris/permintaan)
  async function pageAll<T>(table: string, select: string, apply?: (q: any) => any): Promise<T[]> {
    const out: T[] = []
    for (let from = 0; ; from += 1000) {
      let q = admin.from(table).select(select).range(from, from + 999)
      if (apply) q = apply(q)
      const { data, error } = await q
      if (error) throw new Error(`${table}: ${error.message}`)
      out.push(...((data ?? []) as T[]))
      if (!data || data.length < 1000) break
    }
    return out
  }

  const isDeptScoped = token.scope === 'dept' && token.dept_id
  const actFilter = (q: any) => (isDeptScoped ? q.eq('dept_id', token.dept_id as string) : q)

  const [activities, progressItems, logsToday] = await Promise.all([
    pageAll<ActivityRow>(
      'activities',
      'id, dept_id, title, status, priority, control_status, blocker, next_action, next_action_due_date, pic_id, end_date, last_substantive_update_at, updated_at',
      actFilter
    ),
    pageAll<ProgressItemRow>(
      'progress_items',
      'id, title, pic_id, target_date, status, updated_at',
      (q: any) =>
        isDeptScoped
          ? q.in('pic_id', active.filter((p) => p.dept_id === token.dept_id).map((p) => p.id).concat(['00000000-0000-0000-0000-000000000000']))
          : q
    ),
    pageAll<DailyLogRow>(
      'daily_logs',
      'user_id, log_date, created_at',
      (q: any) => q.eq('log_date', today)
    ),
  ])

  const open = activities.filter((a) => a.status !== 'selesai')
  const doneActivities = activities.filter((a) => a.status === 'selesai')

  const scopedPeople = isDeptScoped
    ? active.filter((p) => p.dept_id === token.dept_id && p.role !== 'kadiv')
    : active.filter((p) => p.role !== 'kadiv')
  const loggedToday = new Set(logsToday.map((l) => l.user_id))

  const bidang = departments
    .filter((d) => !isDeptScoped || d.id === token.dept_id)
    .map((d) => {
      const deptActivities = activities.filter((a) => a.dept_id === d.id)
      const deptOpen = deptActivities.filter((a) => a.status !== 'selesai')

      const butuhPerhatian = deptOpen
        .filter(
          (a) =>
            a.control_status === 'blocked' ||
            a.control_status === 'escalated' ||
            a.control_status === 'needs_kadiv_decision' ||
            a.priority === 'p1'
        )
        .map((a) => {
          const ref = a.last_substantive_update_at ?? a.updated_at
          const days = ref ? daysBetween(wibDateStr(ref), today) : null
          return {
            judul: a.title,
            pic: a.pic_id ? (personName.get(a.pic_id) ?? null) : null,
            status: a.status,
            prioritas: a.priority ?? null,
            status_kendali: a.control_status ?? null,
            hari_tanpa_update: days,
            next_action: a.next_action ?? null,
            tenggat_next_action: a.next_action_due_date ?? null,
            blocker: a.blocker ?? null,
          }
        })
        .sort((x, y) => (y.hari_tanpa_update ?? 0) - (x.hari_tanpa_update ?? 0))

      const progresTerlambat = progressItems
        .filter((p) => p.status !== 'done' && p.target_date < today)
        .filter((p) => {
          const pic = profiles.find((x) => x.id === p.pic_id)
          return pic?.dept_id === d.id
        })
        .map((p) => ({
          judul: p.title,
          pic: personName.get(p.pic_id) ?? 'PIC tidak dikenal',
          target: p.target_date,
          hari_terlambat: daysBetween(p.target_date, today),
          rekor_terakhir_diubah: p.updated_at?.slice(0, 10) ?? '-',
        }))
        .sort((x, y) => y.hari_terlambat - x.hari_terlambat)

      return {
        nama: d.name,
        aktivitas: countBy(deptActivities, (a) => a.status),
        prioritas_p1: deptOpen.filter((a) => a.priority === 'p1').length,
        butuh_perhatian: butuhPerhatian,
        progres_terlambat: progresTerlambat,
      }
    })

  const belumLog = scopedPeople.filter((p) => !loggedToday.has(p.id)).map((p) => p.full_name)
  const sudahLog = scopedPeople.filter((p) => loggedToday.has(p.id)).map((p) => p.full_name)

  return {
    generated_at: new Date().toISOString(),
    timezone: 'Asia/Jakarta',
    tanggal_wib: today,
    bot: {
      label: token.label,
      pemilik: token.owner_name,
      cakupan: isDeptScoped ? (deptName.get(token.dept_id as string) ?? 'bidang') : 'semua bidang',
    },
    aturan: { stale_peringatan_hari: STALE_WARNING_DAYS, stale_kritis_hari: STALE_CRITICAL_DAYS },
    ringkasan: {
      aktivitas_terbuka: open.length,
      aktivitas_selesai: doneActivities.length,
      butuh_keputusan_kadiv: open.filter((a) => a.control_status === 'needs_kadiv_decision').length,
      terhambat: open.filter((a) => a.control_status === 'blocked' || a.control_status === 'escalated').length,
      progres_terlambat: progressItems.filter((p) => p.status !== 'done' && p.target_date < today).length,
      log_hari_ini_sudah: sudahLog.length,
      log_hari_ini_belum: belumLog.length,
    },
    bidang,
    personel: { belum_log_hari_ini: belumLog, sudah_log_hari_ini: sudahLog },
  }
}

export function summaryToText(s: BotSummary): string {
  const L: string[] = []
  L.push('📊 *MONITOR GIAT — RINGKASAN PROGRES*')
  L.push(`Tanggal: ${s.tanggal_wib} (WIB) · Cakupan: ${s.bot.cakupan}`)
  L.push('')
  L.push('*Ringkasan*')
  L.push(`- Kegiatan terbuka: ${s.ringkasan.aktivitas_terbuka}`)
  L.push(`- Butuh keputusan Kadiv: ${s.ringkasan.butuh_keputusan_kadiv}`)
  L.push(`- Terhambat/escalated: ${s.ringkasan.terhambat}`)
  L.push(`- Progres terlambat: ${s.ringkasan.progres_terlambat}`)
  L.push(
    `- Log harian hari ini: ${s.ringkasan.log_hari_ini_sudah} sudah / ${s.ringkasan.log_hari_ini_belum} belum`
  )
  L.push('')

  for (const b of s.bidang) {
    L.push(`*${b.nama}*`)
    const st = Object.entries(b.aktivitas)
      .filter(([k]) => k !== 'selesai')
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ')
    L.push(`- Aktivitas: ${st || 'tidak ada'}`)
    if (b.butuh_perhatian.length) {
      L.push('- Perlu perhatian:')
      for (const a of b.butuh_perhatian.slice(0, 8)) {
        const tag = [
          a.prioritas ? a.prioritas.toUpperCase() : null,
          a.status_kendali ? `kendali: ${a.status_kendali}` : null,
          a.hari_tanpa_update !== null ? `${a.hari_tanpa_update} hari tanpa update` : null,
        ]
          .filter(Boolean)
          .join(', ')
        L.push(`  • ${a.judul}${a.pic ? ` (PIC: ${a.pic})` : ''}${tag ? ` — ${tag}` : ''}`)
        if (a.next_action) L.push(`    → ${a.next_action}${a.tenggat_next_action ? ` (tenggat ${a.tenggat_next_action})` : ''}`)
        if (a.blocker) L.push(`    ⛔ ${a.blocker}`)
      }
    }
    if (b.progres_terlambat.length) {
      L.push('- Progres terlambat:')
      for (const p of b.progres_terlambat.slice(0, 8)) {
        L.push(`  • ${p.judul} — PIC ${p.pic}, target ${p.target} (${p.hari_terlambat} hari)`)
      }
    }
    L.push('')
  }

  L.push('*Log harian belum masuk hari ini*')
  L.push(s.personel.belum_log_hari_ini.length ? s.personel.belum_log_hari_ini.join(', ') : 'Semua sudah mengisi ✅')
  L.push('')
  L.push('_Catatan: `hari tanpa update` berarti rekor di aplikasi belum diperbarui, bukan bukti PIC tidak bekerja._')
  return L.join('\n')
}
