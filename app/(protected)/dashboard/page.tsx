import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DepartmentBoard } from '@/components/DepartmentBoard'
import { DecisionQueue } from '@/components/DecisionQueue'
import { StaleActivities, type StaleActivity } from '@/components/StaleActivities'
import { type Activity, type Department, type Task, DEPT_BG_COLORS } from '@/lib/types'
import {
  TrendingUp, CheckSquare, AlertTriangle, LayoutList,
  CheckCircle2, Clock, ArrowRight, ClipboardList,
} from 'lucide-react'
import { formatDate, daysSinceWIB, staleLevel } from '@/lib/utils'

interface TaskWithActivity extends Task {
  activities: Activity & { departments: Department }
}

function todayStr() {
  return new Date().toLocaleDateString('sv-SE')
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'kadiv') redirect('/login')

  const [
    { data: departments },
    { data: activities },
    { data: tasks },
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
  ])

  const depts   = (departments as Department[]) ?? []
  const acts    = (activities as Activity[]) ?? []
  const pending = (tasks ?? []) as TaskWithActivity[]

  const actsByDept = (deptId: string) => acts.filter((a) => a.dept_id === deptId)

  const totalActs    = acts.length
  const activeActs   = acts.filter((a) => a.status === 'berjalan').length
  const finishedActs = acts.filter((a) => a.status === 'selesai').length
  const overdueActs  = acts.filter(
    (a) => a.status !== 'selesai' && new Date(a.end_date) < new Date()
  ).length

  const today      = todayStr()
  const overdueT   = pending.filter(t => t.due_date && t.due_date < today)
  const todayT     = pending.filter(t => t.due_date === today)
  const urgentList = [...overdueT, ...todayT].slice(0, 8)

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

  const activityStats = [
    { value: totalActs,    label: 'Total Kegiatan',   color: 'var(--navy-900)', bg: 'var(--surface)',  Icon: LayoutList    },
    { value: activeActs,   label: 'Sedang Berjalan',  color: '#d97706',         bg: '#fffbeb',         Icon: TrendingUp    },
    { value: finishedActs, label: 'Selesai',          color: '#059669',         bg: '#f0fdf4',         Icon: CheckSquare   },
    { value: overdueActs,  label: 'Melewati Target',  color: '#dc2626',         bg: '#fef2f2',         Icon: AlertTriangle },
  ]

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h1 className="font-serif leading-tight" style={{ fontSize: '26px', color: 'var(--navy-900)' }}>
          Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Monitor kegiatan seluruh departemen — Divisi Hukum PT Timah
        </p>
      </div>

      {/* ── Activity summary stats ─────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {activityStats.map(({ value, label, color, bg, Icon }) => (
          <div
            key={label}
            className="rounded-2xl p-4"
            style={{ background: bg, border: '1px solid var(--cream-border)', boxShadow: '0 1px 4px rgba(11,25,41,0.05)' }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold leading-none" style={{ color }}>{value}</p>
                <p className="text-xs mt-1.5 leading-tight" style={{ color: 'var(--text-muted)' }}>{label}</p>
              </div>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color === 'var(--navy-900)' ? '#0b1929' : color}15` }}>
                <Icon size={15} style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Decision Queue Kadiv ──────────────────────────── */}
      <DecisionQueue activities={decisionQueue} />

      {/* ── Kegiatan Tanpa Update Substansi ───────────────── */}
      <StaleActivities items={staleItems} />

      {/* ── Pekerjaan Perlu Perhatian ─────────────────────── */}
      {urgentList.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid #fecaca', boxShadow: '0 2px 8px rgba(220,38,38,0.08)' }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ background: '#fff1f1', borderBottom: '1px solid #fecaca' }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} style={{ color: '#dc2626' }} />
              <span className="text-sm font-bold" style={{ color: '#dc2626' }}>
                Pekerjaan Perlu Perhatian
              </span>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#dc262618', color: '#dc2626' }}
              >
                {overdueT.length + todayT.length}
              </span>
            </div>
          </div>

          {/* Column headers */}
          <div
            className="hidden sm:grid text-xs font-semibold uppercase tracking-wider px-4 py-2"
            style={{
              gridTemplateColumns: '1fr 160px 130px 110px',
              color: 'var(--text-muted)',
              background: 'var(--surface)',
              borderBottom: '1px solid var(--cream-border)',
            }}
          >
            <span>Pekerjaan</span>
            <span>Kegiatan</span>
            <span>Departemen</span>
            <span>Target</span>
          </div>

          <div className="bg-white divide-y divide-[--cream-border]">
            {urgentList.map((task) => {
              const isOverdue = task.due_date && task.due_date < today
              const accent    = DEPT_BG_COLORS[task.activities?.departments?.name ?? ''] ?? '#7a8fa8'
              return (
                <Link
                  key={task.id}
                  href={`/activities/${task.activity_id}`}
                  className="flex sm:grid items-start sm:items-center gap-3 px-4 py-3 hover:bg-red-50/30 transition-colors"
                  style={{ gridTemplateColumns: '1fr 160px 130px 110px' }}
                >
                  {/* Name */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-0.5 h-7 rounded-full shrink-0" style={{ background: isOverdue ? '#dc2626' : '#d97706' }} />
                    <div className="min-w-0">
                      <p className="text-sm truncate" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{task.title}</p>
                      <p className="text-xs sm:hidden mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {task.activities?.title} · {task.due_date ? formatDate(task.due_date) : '—'}
                      </p>
                    </div>
                  </div>
                  {/* Activity */}
                  <p className="hidden sm:block text-xs truncate" style={{ color: 'var(--text-muted)' }}>{task.activities?.title}</p>
                  {/* Dept */}
                  <p className="hidden sm:block text-xs truncate font-medium" style={{ color: accent }}>{task.activities?.departments?.name}</p>
                  {/* Due */}
                  <p
                    className="hidden sm:block text-xs font-semibold"
                    style={{ color: isOverdue ? '#dc2626' : '#d97706' }}
                  >
                    {isOverdue
                      ? `Terlambat ${Math.abs(Math.ceil((new Date(task.due_date!).getTime() - new Date(today).getTime()) / 86400000))} hari`
                      : 'Hari Ini'}
                  </p>
                </Link>
              )
            })}
          </div>

        </div>
      )}

      {/* ── Department boards ─────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1" style={{ background: 'var(--cream-border)' }} />
          <p className="text-xs font-bold uppercase tracking-widest shrink-0" style={{ color: 'var(--text-muted)' }}>
            Board Kegiatan per Departemen
          </p>
          <div className="h-px flex-1" style={{ background: 'var(--cream-border)' }} />
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
