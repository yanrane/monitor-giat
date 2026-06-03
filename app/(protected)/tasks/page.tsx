import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { type Task, type Activity, type Department, DEPT_BG_COLORS } from '@/lib/types'
import { TaskToggleButton } from './TaskToggleButton'
import {
  AlertTriangle, Calendar, Clock, CheckCircle2,
  ClipboardList, ChevronRight, ExternalLink,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface TaskWithActivity extends Task {
  activities: Activity & { departments: Department }
}

function todayStr() {
  return new Date().toLocaleDateString('sv-SE')
}

function addDays(base: string, n: number) {
  const d = new Date(base)
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('sv-SE')
}

function StatCard({ value, label, color, bg }: { value: number; label: string; color: string; bg: string }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: bg, border: '1px solid var(--cream-border)', boxShadow: '0 1px 4px rgba(11,25,41,0.05)' }}
    >
      <p className="text-2xl font-bold leading-none" style={{ color }}>{value}</p>
      <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  )
}

interface TaskGroupProps {
  title: string
  badgeColor: string
  badgeBg: string
  borderColor: string
  tasks: TaskWithActivity[]
  canToggle: boolean
  isKadiv: boolean
  icon: React.ReactNode
}

function TaskGroup({ title, badgeColor, badgeBg, borderColor, tasks, canToggle, isKadiv, icon }: TaskGroupProps) {
  if (tasks.length === 0) return null

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--cream-border)', boxShadow: '0 2px 8px rgba(11,25,41,0.06)' }}
    >
      {/* Group header */}
      <div
        className="flex items-center gap-2.5 px-4 py-3"
        style={{ background: badgeBg, borderBottom: `1px solid ${borderColor}` }}
      >
        {icon}
        <span className="text-sm font-bold" style={{ color: badgeColor }}>{title}</span>
        <span
          className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: badgeColor + '18', color: badgeColor }}
        >
          {tasks.length}
        </span>
      </div>

      {/* Column headers */}
      <div
        className="hidden sm:grid text-xs font-semibold uppercase tracking-wider px-4 py-2"
        style={{
          gridTemplateColumns: isKadiv ? '1fr 200px 130px 110px 44px' : '1fr 200px 110px 44px',
          color: 'var(--text-muted)',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--cream-border)',
        }}
      >
        <span>Pekerjaan</span>
        <span>Kegiatan</span>
        {isKadiv && <span>Departemen</span>}
        <span>Target</span>
        <span />
      </div>

      {/* Rows */}
      <div className="bg-white divide-y divide-[--cream-border]">
        {tasks.map((task) => {
          const accent = DEPT_BG_COLORS[task.activities?.departments?.name ?? ''] ?? '#7a8fa8'
          const isDone = task.status === 'done'
          const isOverdue = task.due_date && task.due_date < todayStr() && !isDone

          return (
            <div
              key={task.id}
              className="flex sm:grid items-center gap-3 px-4 py-3 hover:bg-blue-50/30 transition-colors"
              style={{
                gridTemplateColumns: isKadiv ? '1fr 200px 130px 110px 44px' : '1fr 200px 110px 44px',
                background: isDone ? '#f9fafb' : 'white',
              }}
            >
              {/* Toggle */}
              <div className="flex items-center gap-2.5 min-w-0 sm:order-first order-last shrink-0 sm:shrink">
                {canToggle ? (
                  <TaskToggleButton taskId={task.id} activityId={task.activity_id} status={task.status} />
                ) : (
                  isDone
                    ? <CheckCircle2 size={18} style={{ color: '#10b981' }} className="shrink-0" />
                    : <div className="w-[18px] h-[18px] rounded-full shrink-0" style={{ border: '1.5px solid #d1d5db' }} />
                )}

                {/* Mobile: name inline with toggle */}
                <div className="sm:hidden min-w-0 flex-1">
                  <p
                    className="text-sm"
                    style={{
                      color: isDone ? '#9ca3af' : isOverdue ? '#991b1b' : 'var(--text-primary)',
                      textDecoration: isDone ? 'line-through' : 'none',
                    }}
                  >
                    {task.title}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                    {task.activities?.title}
                    {task.due_date && ` · ${formatDate(task.due_date)}`}
                  </p>
                </div>
              </div>

              {/* Name (desktop) */}
              <div className="hidden sm:flex items-center gap-2 min-w-0 pr-2">
                <div className="w-0.5 h-7 rounded-full shrink-0" style={{ background: isDone ? '#d1d5db' : accent }} />
                <p
                  className="text-sm truncate"
                  style={{
                    color: isDone ? '#9ca3af' : isOverdue ? '#991b1b' : 'var(--text-primary)',
                    textDecoration: isDone ? 'line-through' : 'none',
                    fontWeight: isOverdue ? 500 : undefined,
                  }}
                >
                  {task.title}
                </p>
              </div>

              {/* Activity (desktop) */}
              <Link
                href={`/activities/${task.activity_id}`}
                className="hidden sm:flex items-center gap-1 text-xs group truncate pr-2"
                style={{ color: 'var(--text-muted)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="truncate group-hover:underline">{task.activities?.title}</span>
                <ExternalLink size={10} className="shrink-0 opacity-0 group-hover:opacity-60" />
              </Link>

              {/* Dept (kadiv, desktop) */}
              {isKadiv && (
                <div className="hidden sm:block text-xs truncate pr-2" style={{ color: accent, fontWeight: 500 }}>
                  {task.activities?.departments?.name ?? '—'}
                </div>
              )}

              {/* Due date (desktop) */}
              <div
                className="hidden sm:block text-xs"
                style={{ color: isOverdue ? '#991b1b' : isDone ? '#9ca3af' : 'var(--text-muted)', fontWeight: isOverdue ? 600 : undefined }}
              >
                {task.due_date ? formatDate(task.due_date) : '—'}
              </div>

              {/* Link arrow (desktop) */}
              <Link
                href={`/activities/${task.activity_id}`}
                className="hidden sm:flex items-center justify-center w-7 h-7 rounded-lg opacity-0 hover:opacity-100 group-hover:opacity-60 transition-opacity hover:bg-gray-100"
                style={{ color: 'var(--text-muted)' }}
              >
                <ChevronRight size={14} />
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, dept_id').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, activities!inner(id, title, dept_id, status, departments(id, name, sort_order))')
    .order('due_date', { ascending: true, nullsFirst: false })

  const allTasks   = (tasks ?? []) as TaskWithActivity[]
  const today      = todayStr()
  const weekEnd    = addDays(today, 7)

  const overdue  = allTasks.filter(t => t.status === 'pending' && t.due_date && t.due_date < today)
  const dueToday = allTasks.filter(t => t.status === 'pending' && t.due_date === today)
  const thisWeek = allTasks.filter(t => t.status === 'pending' && t.due_date && t.due_date > today && t.due_date <= weekEnd)
  const later    = allTasks.filter(t => t.status === 'pending' && (!t.due_date || t.due_date > weekEnd))
  const done     = allTasks.filter(t => t.status === 'done').slice(0, 20)

  const canToggle = profile.role !== 'kadiv'
  const isKadiv   = profile.role === 'kadiv'

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="font-serif leading-tight" style={{ fontSize: '26px', color: 'var(--navy-900)' }}>
          Tracker Pekerjaan
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {isKadiv
            ? 'Pantau progress pekerjaan seluruh departemen secara harian'
            : 'Kelola dan pantau pekerjaan departemen Anda'}
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard value={overdue.length}  label="Terlambat"   color="#dc2626" bg="#fef2f2" />
        <StatCard value={dueToday.length} label="Hari Ini"    color="#d97706" bg="#fffbeb" />
        <StatCard value={thisWeek.length} label="Minggu Ini"  color="#2563eb" bg="#eff6ff" />
        <StatCard value={done.length}     label="Selesai"     color="#059669" bg="#f0fdf4" />
      </div>

      {allTasks.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl" style={{ border: '1px solid var(--cream-border)' }}>
          <ClipboardList size={36} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Belum ada pekerjaan</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Buka detail kegiatan → tab "Pekerjaan" → klik "Tambah"
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <TaskGroup
            title="Terlambat"
            badgeColor="#dc2626"
            badgeBg="#fff1f1"
            borderColor="#fecaca"
            tasks={overdue}
            canToggle={canToggle}
            isKadiv={isKadiv}
            icon={<AlertTriangle size={14} style={{ color: '#dc2626' }} />}
          />
          <TaskGroup
            title="Hari Ini"
            badgeColor="#d97706"
            badgeBg="#fffbeb"
            borderColor="#fde68a"
            tasks={dueToday}
            canToggle={canToggle}
            isKadiv={isKadiv}
            icon={<Clock size={14} style={{ color: '#d97706' }} />}
          />
          <TaskGroup
            title="Minggu Ini"
            badgeColor="#2563eb"
            badgeBg="#eff6ff"
            borderColor="#bfdbfe"
            tasks={thisWeek}
            canToggle={canToggle}
            isKadiv={isKadiv}
            icon={<Calendar size={14} style={{ color: '#2563eb' }} />}
          />
          <TaskGroup
            title="Mendatang"
            badgeColor="#6b7280"
            badgeBg="var(--surface)"
            borderColor="var(--cream-border)"
            tasks={later}
            canToggle={canToggle}
            isKadiv={isKadiv}
            icon={<ChevronRight size={14} style={{ color: '#6b7280' }} />}
          />
          {done.length > 0 && (
            <TaskGroup
              title="Sudah Selesai"
              badgeColor="#059669"
              badgeBg="#f0fdf4"
              borderColor="#a7f3d0"
              tasks={done}
              canToggle={canToggle}
              isKadiv={isKadiv}
              icon={<CheckCircle2 size={14} style={{ color: '#059669' }} />}
            />
          )}
        </div>
      )}
    </div>
  )
}
