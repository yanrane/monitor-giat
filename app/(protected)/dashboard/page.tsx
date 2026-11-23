import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DepartmentBoard } from '@/components/DepartmentBoard'
import { StaleActivities, type StaleActivity } from '@/components/StaleActivities'
import { CompletionTrend } from '@/components/CompletionTrend'
import { type Activity, type Department, type Task, type ProgressItem, type ProgressProposal, DEPT_BG_COLORS, CONTROL_STATUS_LABELS } from '@/lib/types'
import { StatusBattery, BatteryLegend, type BatterySegment } from '@/components/StatusBattery'
import { AlertTriangle, CalendarClock, Building2, Users, Target, CircleCheck, ChevronDown } from 'lucide-react'
import { formatDate, daysSinceWIB, staleLevel, wibDateStr } from '@/lib/utils'
import { buildAttention, summarizeLogs, lastTouchDate, ATTENTION_LABELS, type AttentionEntry, type AttentionReason } from '@/lib/attention'

const REASON_STYLE: Record<AttentionReason, { color: string; bg: string }> = {
  keputusan:     { color: '#6d4fc4',     bg: '#f3ebfb' },
  lewat_tenggat: { color: 'var(--bad)',  bg: 'var(--bad-bg)' },
  tenggat_dekat: { color: 'var(--warn)', bg: 'var(--warn-bg)' },
  tanpa_update:  { color: '#5b6b80',     bg: '#eef1f5' },
}

const PROPOSAL_STYLE = { color: 'var(--navy-600)', bg: 'var(--navy-50)' }

const REASON_SUMMARY: Record<AttentionReason, string> = {
  keputusan: 'butuh keputusan',
  lewat_tenggat: 'lewat tenggat',
  tenggat_dekat: 'P1 tenggat ≤ 3 hari',
  tanpa_update: 'diam ≥ 14 hari',
}

function reasonLabel(r: AttentionReason, e: AttentionEntry<Activity>) {
  if (r === 'lewat_tenggat') return `Lewat ${e.overdueDays} hari`
  if (r === 'tanpa_update') return `Diam ${e.idleDays} hari`
  return ATTENTION_LABELS[r]
}

// Satu baris "Butuh Anda hari ini" — juga menggantikan panel "Menunggu keputusan Kadiv"
function AttentionRow({ e }: { e: AttentionEntry<Activity> }) {
  const a = e.activity
  const decision = e.reasons.includes('keputusan')
    ? (a.decision_needed ?? (a.control_status ? CONTROL_STATUS_LABELS[a.control_status] : null))
    : null

  return (
    <Link href={`/activities/${a.id}`} className="block px-4 py-3 transition-colors hover:bg-(--surface-2)">
      <div className="flex flex-wrap items-center gap-1.5 mb-1">
        {e.reasons.map((r) => (
          <span
            key={r}
            className="text-[10.5px] font-bold px-1.5 py-px rounded tracking-wide"
            style={{ color: REASON_STYLE[r].color, background: REASON_STYLE[r].bg }}
          >
            {reasonLabel(r, e).toUpperCase()}
          </span>
        ))}
        {a.priority === 'p1' && <span className="text-[10.5px] font-bold" style={{ color: 'var(--bad)' }}>P1</span>}
      </div>
      <p className="text-sm font-medium leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>{a.title}</p>
      {decision && (
        <p className="text-xs mt-1 line-clamp-2 font-medium" style={{ color: '#6d4fc4' }}>Perlu diputuskan: {decision}</p>
      )}
      {(a.next_action || !decision) && (
        <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
          {a.next_action
            ? `Langkah: ${a.next_action}${a.next_action_due_date ? ` · tenggat ${formatDate(a.next_action_due_date)}` : ''}`
            : 'Belum ada langkah berikutnya yang dicatat'}
        </p>
      )}
      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
        <span className="font-medium" style={{ color: DEPT_BG_COLORS[a.departments?.name ?? ''] ?? '#7a8fa8' }}>
          {a.departments?.name}
        </span>
        {a.pic?.full_name && ` · ${a.pic.full_name}`}
      </p>
    </Link>
  )
}

// Sebaran status kegiatan — dipakai strip ringkasan dan widget per departemen
function statusSegments(list: Activity[]): BatterySegment[] {
  const count = (s: Activity['status']) => list.filter((a) => a.status === s).length
  return [
    { label: 'selesai',     n: count('selesai'),     color: 'var(--ok)' },
    { label: 'berjalan',    n: count('berjalan'),    color: '#d9a428' },
    { label: 'belum mulai', n: count('belum_mulai'), color: '#b7c0cc' },
    { label: 'ditunda',     n: count('ditunda'),     color: 'var(--bad)' },
  ]
}

// Kartu widget ala dashboard monday.com
function Widget({ icon, title, note, children }: {
  icon: React.ReactNode; title: string; note?: string; children: React.ReactNode
}) {
  return (
    <section
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(11,25,41,0.05)' }}
    >
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--separator)' }}>
        <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--navy-50)', color: 'var(--navy-600)' }}>
          {icon}
        </span>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        {note && <span className="ml-auto text-xs" style={{ color: 'var(--text-tertiary)' }}>{note}</span>}
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </section>
  )
}

interface TaskWithActivity extends Task {
  activities: Activity & { departments: Department }
}

function wibGreeting() {
  const hour = Number(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour: 'numeric', hour12: false })
  )
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 18) return 'Selamat sore'
  return 'Selamat malam'
}

function wibLongDate() {
  return new Date().toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function wibWeekInfo() {
  const today = new Date(wibDateStr())
  const start = new Date(today.getFullYear(), 0, 1)
  const week = Math.ceil(((today.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
  const semester = today.getMonth() < 6 ? 'I' : 'II'
  return `Semester ${semester} · Minggu ke-${week}`
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (profile?.role !== 'kadiv') redirect('/login')

  const today   = wibDateStr()
  const week7   = wibDateStr(new Date(Date.now() + 7 * 86400000))

  const [
    { data: departments },
    { data: activities },
    { data: tasks },
    { data: openProgressRaw },
    { data: proposalsRaw },
    { data: logRowsRaw },
  ] = await Promise.all([
    supabase.from('departments').select('*').order('sort_order'),
    supabase
      .from('activities')
      .select('*, departments(name), tasks(id, status, due_date), pic:pic_id(full_name)')
      .order('end_date', { ascending: true }),
    supabase
      .from('tasks')
      .select('*, activities!inner(id, title, dept_id, departments(id, name))')
      .eq('status', 'pending')
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('progress_items')
      .select('*, pic:pic_id(full_name)')
      .neq('status', 'done')
      .order('target_date', { ascending: true }),
    // Usulan target dari disposisi TEO yang menunggu Kadiv (RLS: hanya Kadiv)
    supabase
      .from('progress_proposals')
      .select('id, teo_ref, perihal, judul, pic_ids, target_date')
      .eq('status', 'menunggu')
      .order('created_at', { ascending: true }),
    // Log harian terkait kegiatan = jejak progres board (60 hari; urutan penting untuk summarizeLogs)
    // ponytail: PostgREST maks 1000 baris → bila >1000 log terkait/60 hari, hitungan "N log" terpotong (log terakhir tetap benar)
    supabase
      .from('daily_logs')
      .select('activity_id, log_date, content, profiles(full_name)')
      .not('activity_id', 'is', null)
      .gte('log_date', wibDateStr(new Date(Date.now() - 60 * 86400000)))
      .order('log_date', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  const depts   = (departments as Department[]) ?? []
  const logStats = summarizeLogs(
    ((logRowsRaw ?? []) as unknown as { activity_id: string; log_date: string; content: string; profiles: { full_name: string } | null }[])
      .map((r) => ({ activity_id: r.activity_id, log_date: r.log_date, content: r.content, author: r.profiles?.full_name ?? null }))
  )
  // Log terkait ikut dihitung sebagai "disentuh" → kegiatan yang rajin dilog tidak dianggap diam
  const acts: Activity[] = ((activities as Activity[]) ?? []).map((a) => ({ ...a, last_log_date: logStats[a.id]?.lastDate ?? null }))
  const pending = (tasks ?? []) as TaskWithActivity[]

  const actsByDept = (deptId: string) => acts.filter((a) => a.dept_id === deptId)

  const totalActs    = acts.length
  const activeActs   = acts.filter((a) => a.status === 'berjalan').length
  const finishedActs = acts.filter((a) => a.status === 'selesai').length
  const pausedActs   = acts.filter((a) => a.status === 'ditunda').length
  const notStarted   = acts.filter((a) => a.status === 'belum_mulai').length
  const overdueActs  = acts.filter(
    (a) => a.status !== 'selesai' && new Date(a.end_date) < new Date()
  ).length

  const pct = (n: number) => (totalActs > 0 ? (n / totalActs) * 100 : 0)

  // Tugas terlambat > 60 hari hampir pasti lupa ditutup — dipisah agar tidak menenggelamkan yang aktual
  const CLEANUP_DAYS = 60
  const lateDaysOf = (t: Task) => Math.round((Date.parse(today) - Date.parse(t.due_date!)) / 86400000)
  const overdueAll = pending.filter(t => t.due_date && t.due_date < today)
  const overdueT   = overdueAll.filter(t => lateDaysOf(t) <= CLEANUP_DAYS)
  const cleanupT   = overdueAll.filter(t => lateDaysOf(t) > CLEANUP_DAYS)
  const todayT     = pending.filter(t => t.due_date === today)
  const urgentList = [...overdueT, ...todayT].slice(0, 8)
  const showTasks  = urgentList.length > 0 || cleanupT.length > 0

  // Semua pengecualian; 7 teratas tampil, sisanya bisa dibuka
  const attention = buildAttention(acts, today, Infinity)
  const ATTENTION_TOP = 7
  const attentionTop  = attention.items.slice(0, ATTENTION_TOP)
  const attentionRest = attention.items.slice(ATTENTION_TOP)

  // Usulan tampil di atas kegiatan dan tidak memakan jatah 7 teratas
  const proposals = (proposalsRaw ?? []) as Pick<ProgressProposal, 'id' | 'teo_ref' | 'perihal' | 'judul' | 'pic_ids' | 'target_date'>[]
  const proposalPicIds = [...new Set(proposals.flatMap((p) => p.pic_ids))]
  const { data: proposalPics } = proposalPicIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', proposalPicIds)
    : { data: [] as { id: string; full_name: string }[] }
  const picName = new Map((proposalPics ?? []).map((p) => [p.id as string, p.full_name as string]))
  const needsYou = attention.total + proposals.length

  // Target terdekat: grup kerja tim (title|target_date), maks 5
  const openProgress = (openProgressRaw ?? []) as ProgressItem[]
  const upcoming = openProgress.filter((it) => it.target_date >= today && it.target_date <= week7)
  const upcomingGroups = Object.values(
    upcoming.reduce<Record<string, { item: ProgressItem; pics: string[] }>>((accum, it) => {
      const key = `${it.title}|${it.target_date}`
      if (!accum[key]) accum[key] = { item: it, pics: [] }
      if (it.pic?.full_name) accum[key].pics.push(it.pic.full_name)
      return accum
    }, {})
  ).slice(0, 5)
  const showUpcoming = upcomingGroups.length > 0

  // ── Legal Command System ────────────────────────────────
  const isOpen = (a: Activity) => a.status !== 'selesai' && a.status !== 'ditunda'

  const staleItems: StaleActivity[] = acts
    .filter(isOpen)
    .map((a) => ({
      activity: a,
      days: daysSinceWIB(lastTouchDate(a.last_substantive_update_at ?? a.updated_at, a.last_log_date)),
      level: staleLevel(daysSinceWIB(lastTouchDate(a.last_substantive_update_at ?? a.updated_at, a.last_log_date))),
    }))
    .filter((i): i is StaleActivity => i.level !== 'ok')
    .sort((a, b) => b.days - a.days)

  const firstName = profile.full_name?.split(' ').find((n: string) => n.length > 2) ?? profile.full_name

  const segments = statusSegments(acts).filter(s => s.n > 0)

  // Widget beban kerja per PIC (pola "Workload" monday): kegiatan terbuka + item progress belum selesai.
  // Item multi-PIC tersimpan satu baris per orang, jadi tiap PIC terhitung sendiri-sendiri.
  type Load = { id: string; name: string; kegiatan: number; progress: number; lewat: number; total: number }
  const loadMap = new Map<string, Load>()
  const bump = (id: string | null, name: string | undefined, key: 'kegiatan' | 'progress' | 'lewat') => {
    if (!id) return
    const row = loadMap.get(id) ?? { id, name: name ?? '—', kegiatan: 0, progress: 0, lewat: 0, total: 0 }
    row[key] += 1
    row.total += 1
    loadMap.set(id, row)
  }
  acts.filter(isOpen).forEach((a) => bump(a.pic_id, a.pic?.full_name, 'kegiatan'))
  openProgress.forEach((it) => bump(it.pic_id, it.pic?.full_name, it.target_date < today ? 'lewat' : 'progress'))
  const allLoads = [...loadMap.values()]
  const workload = [...allLoads].sort((a, b) => b.total - a.total).slice(0, 8)
  const maxLoad = workload[0]?.total ?? 0
  const loadSegments = (l: Pick<Load, 'kegiatan' | 'progress' | 'lewat'>): BatterySegment[] => [
    { label: 'kegiatan terbuka', n: l.kegiatan, color: 'var(--navy-300)' },
    { label: 'item progress',    n: l.progress, color: 'var(--run)' },
    { label: 'melewati target',  n: l.lewat,    color: 'var(--bad)' },
  ]
  const loadTotals = allLoads.reduce(
    (sum, l) => ({ kegiatan: sum.kegiatan + l.kegiatan, progress: sum.progress + l.progress, lewat: sum.lewat + l.lewat }),
    { kegiatan: 0, progress: 0, lewat: 0 }
  )

  return (
    <div className="space-y-5">
      {/* ── Heading: sapaan + konteks waktu ────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif leading-tight" style={{ fontSize: '27px', color: 'var(--navy-900)', letterSpacing: '-0.012em' }}>
            {wibGreeting()}, Pak {firstName}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Ringkasan kegiatan seluruh departemen — diperbarui otomatis
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{wibLongDate()}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{wibWeekInfo()}</p>
        </div>
      </div>

      {/* ── Butuh Anda hari ini: pengecualian saja; terlipat, judul memuat ringkasan ── */}
      {needsYou === 0 ? (
        <p
          className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm"
          style={{ color: 'var(--ok)', background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <CircleCheck size={15} /> Tidak ada keputusan, tenggat terlewat, atau kegiatan diam yang butuh Anda.
        </p>
      ) : (
        <details
          className="group/att rounded-2xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(11,25,41,0.05)' }}
        >
          <summary className="block px-4 py-3 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden transition-colors hover:bg-(--surface-2)">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--navy-50)' }}>
                <Target size={13} style={{ color: 'var(--navy-600)' }} />
              </span>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Butuh Anda hari ini</h2>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-md tabular-nums"
                style={{ background: 'var(--navy-50)', color: 'var(--navy-600)' }}
              >
                {needsYou}
              </span>
              <span className="ml-auto hidden sm:block text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <span className="group-open/att:hidden">klik untuk membuka</span>
                <span className="hidden group-open/att:inline">
                  {proposals.length > 0 && `${proposals.length} usulan · `}
                  {attentionRest.length > 0 ? `${attentionTop.length} teratas dari ${attention.total} kegiatan` : `${attention.total} kegiatan`}
                </span>
              </span>
              <ChevronDown
                size={15}
                className="ml-auto sm:ml-0 shrink-0 transition-transform group-open/att:rotate-180"
                style={{ color: 'var(--text-muted)' }}
              />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2 pl-8">
              {proposals.length > 0 && (
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded tabular-nums"
                  style={{ color: PROPOSAL_STYLE.color, background: PROPOSAL_STYLE.bg }}
                >
                  {proposals.length} usulan target
                </span>
              )}
              {(Object.keys(attention.counts) as AttentionReason[])
                .filter((r) => attention.counts[r] > 0)
                .map((r) => (
                  <span
                    key={r}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded tabular-nums"
                    style={{ color: REASON_STYLE[r].color, background: REASON_STYLE[r].bg }}
                  >
                    {attention.counts[r]} {REASON_SUMMARY[r]}
                  </span>
                ))}
            </div>
          </summary>

          <div style={{ borderTop: '1px solid var(--separator)' }}>
            {proposals.length > 0 && (
              <div className="divide-y divide-(--separator)" style={{ borderBottom: '1px solid var(--separator)' }}>
                {proposals.map((p) => (
                  <Link key={p.id} href={`/usulan/${p.id}`} className="block px-4 py-3 transition-colors hover:bg-(--surface-2)">
                    <span
                      className="inline-block text-[10.5px] font-bold px-1.5 py-px rounded tracking-wide mb-1"
                      style={{ color: PROPOSAL_STYLE.color, background: PROPOSAL_STYLE.bg }}
                    >
                      USULAN TARGET
                    </span>
                    <p className="text-sm font-medium leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>{p.judul}</p>
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                      {p.perihal} · TEO {p.teo_ref}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {p.pic_ids.map((id) => picName.get(id) ?? 'PIC tidak dikenal').join(', ')} · usulan tenggat {formatDate(p.target_date)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
            <div className="divide-y divide-(--separator)">
              {attentionTop.map((e) => <AttentionRow key={e.activity.id} e={e} />)}
            </div>
            {attentionRest.length > 0 && (
              <details className="group/rest" style={{ borderTop: '1px solid var(--separator)' }}>
                <summary
                  className="px-4 py-2.5 text-xs font-medium cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden hover:bg-(--surface-2)"
                  style={{ color: 'var(--navy-600)' }}
                >
                  <span className="group-open/rest:hidden">Tampilkan {attentionRest.length} lainnya</span>
                  <span className="hidden group-open/rest:inline">Sembunyikan {attentionRest.length} lainnya</span>
                </summary>
                <div className="divide-y divide-(--separator)" style={{ borderTop: '1px solid var(--separator)' }}>
                  {attentionRest.map((e) => <AttentionRow key={e.activity.id} e={e} />)}
                </div>
              </details>
            )}
          </div>
        </details>
      )}

      {/* ── Strip ringkasan + bar distribusi ───────────────── */}
      <div
        className="rounded-2xl px-5 py-4 grid gap-x-8 gap-y-3 items-center sm:grid-cols-[auto_1fr]"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(11,25,41,0.05)' }}
      >
        <div className="flex items-baseline gap-2.5">
          <span className="font-serif tabular-nums leading-none" style={{ fontSize: '46px', color: 'var(--navy-900)', letterSpacing: '-0.02em' }}>
            {totalActs}
          </span>
          <span className="text-xs leading-tight max-w-[90px]" style={{ color: 'var(--text-muted)' }}>
            total kegiatan tahun ini
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex h-3 rounded-full overflow-hidden" style={{ background: 'var(--separator)' }}>
            {segments.map((s, i) => (
              <div key={i} style={{ width: `${pct(s.n)}%`, background: s.color }} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-2.5 text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
            <span><i className="inline-block w-2 h-2 rounded-sm mr-1.5 align-baseline" style={{ background: 'var(--ok)' }} /><b>{finishedActs}</b> selesai · {Math.round(pct(finishedActs))}%</span>
            <span><i className="inline-block w-2 h-2 rounded-sm mr-1.5 align-baseline" style={{ background: '#d9a428' }} /><b>{activeActs}</b> berjalan</span>
            {notStarted > 0 && (
              <span><i className="inline-block w-2 h-2 rounded-sm mr-1.5 align-baseline" style={{ background: '#b7c0cc' }} /><b>{notStarted}</b> belum mulai</span>
            )}
            {pausedActs > 0 && (
              <span><i className="inline-block w-2 h-2 rounded-sm mr-1.5 align-baseline" style={{ background: 'var(--bad)' }} /><b>{pausedActs}</b> ditunda</span>
            )}
            {overdueActs > 0 && (
              <span
                className="ml-auto font-semibold px-2.5 py-1 rounded-lg"
                style={{ background: 'var(--bad-bg)', color: 'var(--bad)', border: '1px solid #efcfca' }}
              >
                ⚠ {overdueActs} melewati target
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Perlu Perhatian + Target Terdekat ──────────────── */}
      {(showTasks || showUpcoming) && (
        // Dua kolom hanya kalau keduanya ada (tinggi disamakan); kalau satu, selebar penuh
        <div className={`grid gap-4 ${showTasks && showUpcoming ? 'lg:grid-cols-2' : ''}`}>
          {showTasks && (
            <section
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(11,25,41,0.05)' }}
            >
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--separator)' }}>
                <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--bad-bg)' }}>
                  <AlertTriangle size={13} style={{ color: 'var(--bad)' }} />
                </span>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--bad)' }}>Tugas lewat tenggat / hari ini</h2>
                <span className="ml-auto text-xs tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                  {overdueT.length + todayT.length} pekerjaan
                </span>
              </div>
              <div className="p-3 space-y-2">
                {urgentList.map((task) => {
                  const isOverdue = task.due_date && task.due_date < today
                  const lateDays  = isOverdue
                    ? Math.abs(Math.ceil((new Date(task.due_date!).getTime() - new Date(today).getTime()) / 86400000))
                    : 0
                  const accent = DEPT_BG_COLORS[task.activities?.departments?.name ?? ''] ?? '#7a8fa8'
                  return (
                    <Link
                      key={task.id}
                      href={`/activities/${task.activity_id}`}
                      className="block rounded-lg px-3.5 py-2.5 transition-colors hover:brightness-[0.98]"
                      style={{
                        background: isOverdue ? 'var(--bad-bg)' : 'var(--warn-bg)',
                        borderLeft: `3px solid ${isOverdue ? 'var(--bad)' : 'var(--warn)'}`,
                      }}
                    >
                      <p className="text-sm font-medium leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                        {task.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1.5 text-xs">
                        <span
                          className="font-bold px-1.5 py-px rounded text-[10.5px] tracking-wide"
                          style={{
                            background: '#fff',
                            color: isOverdue ? 'var(--bad)' : 'var(--warn)',
                            border: `1px solid ${isOverdue ? '#efcfca' : '#eed9b4'}`,
                          }}
                        >
                          {isOverdue ? `TERLAMBAT ${lateDays} HARI` : 'TARGET HARI INI'}
                        </span>
                        <span className="font-medium" style={{ color: accent }}>{task.activities?.departments?.name}</span>
                        <span className="truncate max-w-[180px]" style={{ color: 'var(--text-muted)' }}>{task.activities?.title}</span>
                      </div>
                    </Link>
                  )
                })}
                {cleanupT.length > 0 && (
                  <details className="rounded-lg" style={{ border: '1px dashed var(--border)' }}>
                    <summary className="text-xs cursor-pointer select-none px-3 py-2" style={{ color: 'var(--text-muted)' }}>
                      Perlu dibersihkan ({cleanupT.length}) — terlambat &gt; {CLEANUP_DAYS} hari, kemungkinan lupa ditutup
                    </summary>
                    <div className="px-1.5 pb-1.5">
                      {cleanupT.map((task) => (
                        <Link
                          key={task.id}
                          href={`/activities/${task.activity_id}`}
                          className="flex items-baseline gap-2 text-xs px-2 py-1.5 rounded transition-colors hover:bg-(--surface-2)"
                        >
                          <span className="font-semibold tabular-nums shrink-0" style={{ color: 'var(--bad)' }}>{lateDaysOf(task)} hr</span>
                          <span className="line-clamp-1" style={{ color: 'var(--text-secondary)' }}>{task.title}</span>
                        </Link>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </section>
          )}

          {showUpcoming && (
            <section
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(11,25,41,0.05)' }}
            >
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--separator)' }}>
                <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--navy-50)' }}>
                  <CalendarClock size={13} style={{ color: 'var(--navy-600)' }} />
                </span>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Target terdekat</h2>
                <span className="ml-auto text-xs" style={{ color: 'var(--text-tertiary)' }}>7 hari ke depan</span>
              </div>
              <div className="py-1.5">
                {upcomingGroups.map(({ item, pics }) => {
                  const d = new Date(item.target_date + 'T00:00:00')
                  return (
                    <Link
                      key={`${item.title}|${item.target_date}`}
                      href="/progress"
                      className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-[--surface-2]"
                    >
                      <span
                        className="shrink-0 w-10 rounded-lg overflow-hidden text-center tabular-nums"
                        style={{ border: '1px solid var(--border)' }}
                      >
                        <b className="block text-[15px] leading-none pt-1.5 pb-1" style={{ color: 'var(--text-primary)' }}>
                          {d.getDate()}
                        </b>
                        <span
                          className="block text-[9px] font-bold tracking-wider uppercase py-0.5"
                          style={{ background: 'var(--navy-800)', color: '#fff' }}
                        >
                          {d.toLocaleDateString('id-ID', { month: 'short' })}
                        </span>
                      </span>
                      <span className="min-w-0">
                        <p className="text-sm font-medium leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                          {item.title}
                        </p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                          {pics.length > 0 ? (pics.length > 2 ? `${pics.slice(0, 2).join(', ')} +${pics.length - 2}` : pics.join(', ')) : '—'}
                          {item.target_date === today && <span className="font-semibold" style={{ color: 'var(--warn)' }}> · hari ini</span>}
                        </p>
                      </span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── Widget ala monday: battery per departemen + beban kerja per PIC (selebar penuh) ── */}
      <div className="grid gap-4">
        <Widget icon={<Building2 size={13} />} title="Sebaran status per departemen" note="kegiatan">
          {depts.map((dept) => {
            const list = actsByDept(dept.id)
            const done = list.filter((a) => a.status === 'selesai').length
            return (
              <div key={dept.id}>
                <div className="flex items-center gap-2 text-xs mb-1.5">
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: DEPT_BG_COLORS[dept.name] ?? '#7a8fa8' }} />
                  <span className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{dept.name}</span>
                  <span className="ml-auto tabular-nums shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {list.length > 0 ? `${Math.round((done / list.length) * 100)}% selesai · ${list.length}` : 'belum ada kegiatan'}
                  </span>
                </div>
                <StatusBattery segments={statusSegments(list)} showLegend={false} />
              </div>
            )
          })}
          <BatteryLegend segments={statusSegments(acts)} />
        </Widget>

        {workload.length > 0 && (
          <Widget icon={<Users size={13} />} title="Beban kerja per PIC" note="belum selesai">
            {workload.map((l) => (
              <div key={l.id} className="flex items-center gap-3 text-xs">
                <span className="w-32 shrink-0 truncate" style={{ color: 'var(--text-secondary)' }} title={l.name}>{l.name}</span>
                <div className="flex-1 min-w-0">
                  <div style={{ width: `${(l.total / maxLoad) * 100}%` }}>
                    <StatusBattery segments={loadSegments(l)} showLegend={false} />
                  </div>
                </div>
                <span className="w-6 shrink-0 text-right font-semibold tabular-nums" style={{ color: l.lewat > 0 ? 'var(--bad)' : 'var(--text-primary)' }}>
                  {l.total}
                </span>
              </div>
            ))}
            <BatteryLegend segments={loadSegments(loadTotals)} />
          </Widget>
        )}
      </div>

      {/* ── Tren penyelesaian ─────────────────────────────── */}
      <CompletionTrend activities={acts} />

      {/* ── Kegiatan Tanpa Update Substansi ───────────────── */}
      <StaleActivities items={staleItems} />

      {/* ── Department boards ─────────────────────────────── */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
          <p className="text-xs font-bold uppercase tracking-widest shrink-0" style={{ color: 'var(--text-muted)' }}>
            Board Kegiatan per Departemen
          </p>
          <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
        </div>

        {depts.map((dept) => (
          <DepartmentBoard
            key={dept.id}
            department={dept}
            activities={actsByDept(dept.id)}
            canAdd={false}
            logStats={logStats}
            today={today}
          />
        ))}
      </div>
    </div>
  )
}
