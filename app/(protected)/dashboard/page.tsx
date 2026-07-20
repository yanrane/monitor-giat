import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DepartmentBoard } from '@/components/DepartmentBoard'
import { DecisionQueue } from '@/components/DecisionQueue'
import { StaleActivities, type StaleActivity } from '@/components/StaleActivities'
import { type Activity, type Department, type Task, type ProgressItem, DEPT_BG_COLORS } from '@/lib/types'
import { AlertTriangle, CalendarClock } from 'lucide-react'
import { formatDate, daysSinceWIB, staleLevel, wibDateStr } from '@/lib/utils'

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
    { data: upcomingRaw },
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
      .gte('target_date', today)
      .lte('target_date', week7)
      .order('target_date', { ascending: true }),
  ])

  const depts   = (departments as Department[]) ?? []
  const acts    = (activities as Activity[]) ?? []
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

  const overdueT   = pending.filter(t => t.due_date && t.due_date < today)
  const todayT     = pending.filter(t => t.due_date === today)
  const urgentList = [...overdueT, ...todayT].slice(0, 8)

  // Target terdekat: grup kerja tim (title|target_date), maks 5
  const upcoming = (upcomingRaw ?? []) as ProgressItem[]
  const upcomingGroups = Object.values(
    upcoming.reduce<Record<string, { item: ProgressItem; pics: string[] }>>((accum, it) => {
      const key = `${it.title}|${it.target_date}`
      if (!accum[key]) accum[key] = { item: it, pics: [] }
      if (it.pic?.full_name) accum[key].pics.push(it.pic.full_name)
      return accum
    }, {})
  ).slice(0, 5)

  // ── Legal Command System ────────────────────────────────
  const isOpen = (a: Activity) => a.status !== 'selesai' && a.status !== 'ditunda'

  const decisionQueue = acts
    .filter((a) => isOpen(a) && (
      a.decision_needed ||
      a.control_status === 'needs_kadiv_decision' ||
      a.control_status === 'escalated'
    ))
    .sort((a, b) =>
      // P1 dulu, lalu target next action terdekat (tanpa target di belakang),
      // lalu yang paling lama tidak di-update
      a.priority.localeCompare(b.priority) ||
      (a.next_action_due_date ?? '9999').localeCompare(b.next_action_due_date ?? '9999') ||
      (a.last_substantive_update_at ?? '').localeCompare(b.last_substantive_update_at ?? '')
    )

  const staleItems: StaleActivity[] = acts
    .filter(isOpen)
    .map((a) => ({
      activity: a,
      days: daysSinceWIB(a.last_substantive_update_at ?? a.updated_at),
      level: staleLevel(daysSinceWIB(a.last_substantive_update_at ?? a.updated_at)),
    }))
    .filter((i): i is StaleActivity => i.level !== 'ok')
    .sort((a, b) => b.days - a.days)

  const firstName = profile.full_name?.split(' ').find((n: string) => n.length > 2) ?? profile.full_name

  const segments = [
    { n: finishedActs, color: 'var(--ok)' },
    { n: activeActs,   color: '#d9a428' },
    { n: notStarted,   color: '#b7c0cc' },
    { n: pausedActs,   color: 'var(--bad)' },
  ].filter(s => s.n > 0)

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
      {(urgentList.length > 0 || upcomingGroups.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2 items-start">
          {urgentList.length > 0 && (
            <section
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(11,25,41,0.05)' }}
            >
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--separator)' }}>
                <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--bad-bg)' }}>
                  <AlertTriangle size={13} style={{ color: 'var(--bad)' }} />
                </span>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--bad)' }}>Perlu perhatian</h2>
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
              </div>
            </section>
          )}

          {upcomingGroups.length > 0 && (
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

      {/* ── Decision Queue Kadiv ──────────────────────────── */}
      <DecisionQueue activities={decisionQueue} />

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
          />
        ))}
      </div>
    </div>
  )
}
