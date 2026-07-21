'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, Plus, CheckCircle2, Circle, Clock, PauseCircle } from 'lucide-react'
import { type Department, type Activity, DEPT_BG_COLORS, STATUS_LABELS } from '@/lib/types'
import { formatDate, daysUntil } from '@/lib/utils'

interface DepartmentBoardProps {
  department: Department
  activities: Activity[]
  canAdd?: boolean
}

const STATUS_ICONS = {
  belum_mulai: Circle,
  berjalan: Clock,
  selesai: CheckCircle2,
  ditunda: PauseCircle,
}

const STATUS_DOT_COLORS = {
  belum_mulai: '#2458a6',
  berjalan: '#a05c0a',
  selesai: '#1e7a56',
  ditunda: '#b3362a',
}

export function DepartmentBoard({ department, activities, canAdd = false }: DepartmentBoardProps) {
  const [collapsed, setCollapsed] = useState(false)
  const accent = DEPT_BG_COLORS[department.name] ?? '#7a8fa8'

  const totalActs   = activities.length
  const doneActs    = activities.filter((a) => a.status === 'selesai').length
  const activeActs  = activities.filter((a) => a.status === 'berjalan').length
  const progress    = totalActs > 0 ? Math.round((doneActs / totalActs) * 100) : 0

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--cream-border)', boxShadow: '0 2px 8px rgba(11,25,41,0.06)' }}
    >
      {/* Board header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center gap-3 px-4 py-3 transition-colors"
        style={{
          background: `${accent}10`,
          borderBottom: collapsed ? 'none' : `1px solid ${accent}20`,
        }}
      >
        <div className="w-2.5 h-2.5 rounded shrink-0" style={{ background: accent }} />
        <span className="font-bold text-sm text-left" style={{ color: 'var(--text-primary)' }}>
          {department.name}
        </span>
        {totalActs > 0 && progress === 100 && (
          <span
            className="text-[10px] font-bold tracking-wider px-1.5 py-px rounded"
            style={{ background: 'var(--ok-bg)', color: 'var(--ok)' }}
          >
            TUNTAS
          </span>
        )}
        <div className="flex items-center gap-3 flex-1 justify-end">
          {activeActs > 0 && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums"
              style={{ background: 'var(--warn-bg)', color: 'var(--warn)' }}
            >
              {activeActs} berjalan
            </span>
          )}
          <span className="text-xs font-medium tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {doneActs}/{totalActs} selesai
          </span>
          {/* mini progress bar */}
          {totalActs > 0 && (
            <div className="hidden sm:flex items-center gap-1.5">
              <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progress}%`, background: accent }}
                />
              </div>
              <span className="text-xs font-bold tabular-nums" style={{ color: accent }}>{progress}%</span>
            </div>
          )}
          {collapsed ? <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
        </div>
      </button>

      {!collapsed && (
        <>
          {/* Column headers (desktop) */}
          <div
            className="hidden sm:grid text-xs font-semibold uppercase tracking-wider px-4 py-2"
            style={{
              gridTemplateColumns: '1fr 130px 120px 110px 120px',
              color: 'var(--text-muted)',
              background: 'var(--surface)',
              borderBottom: '1px solid var(--cream-border)',
            }}
          >
            <span>Nama Kegiatan</span>
            <span>Status</span>
            <span>PIC</span>
            <span>Target Selesai</span>
            <span>Progress</span>
          </div>

          {/* Rows */}
          <div className="bg-white divide-y divide-[--cream-border]">
            {activities.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                Belum ada kegiatan
              </div>
            ) : (
              activities.map((activity) => (
                <ProjectRow key={activity.id} activity={activity} accent={accent} />
              ))
            )}
          </div>

          {/* Add button */}
          {canAdd && (
            <Link
              href={`/activities/new`}
              className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50"
              style={{
                color: accent,
                borderTop: '1px solid var(--cream-border)',
                background: 'white',
              }}
            >
              <Plus size={14} />
              <span className="font-medium">Tambah Kegiatan</span>
            </Link>
          )}
        </>
      )}
    </div>
  )
}

function ProjectRow({ activity, accent }: { activity: Activity; accent: string }) {
  const StatusIcon = STATUS_ICONS[activity.status]
  const dotColor   = STATUS_DOT_COLORS[activity.status]
  const days       = daysUntil(activity.end_date)
  const isOverdue  = days < 0 && activity.status !== 'selesai'
  const isUrgent   = days >= 0 && days <= 3 && activity.status !== 'selesai'

  const tasks      = activity.tasks ?? []
  const taskTotal  = tasks.length
  const taskDone   = tasks.filter((t) => t.status === 'done').length
  const taskPct    = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0

  const picName    = activity.pic?.full_name ?? '—'

  return (
    <Link href={`/activities/${activity.id}`}>
      {/* Desktop row */}
      <div
        className="hidden sm:grid items-center px-4 py-3 hover:bg-[--surface-2] transition-colors cursor-pointer group"
        style={{ gridTemplateColumns: '1fr 130px 120px 110px 120px' }}
      >
        {/* Name */}
        <div className="flex items-center gap-2.5 min-w-0 pr-3">
          <div className="w-0.5 h-8 rounded-full shrink-0" style={{ background: accent }} />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate transition-colors" style={{ color: 'var(--text-primary)' }}>
              {activity.title}
            </p>
            {(isOverdue || isUrgent) && (
              <p className="text-xs mt-0.5 font-medium" style={{ color: isOverdue ? '#b3362a' : '#a05c0a' }}>
                {isOverdue ? `Terlambat ${Math.abs(days)} hari` : `${days} hari lagi`}
              </p>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5">
          <StatusIcon size={13} style={{ color: dotColor }} />
          <span className="text-xs font-medium" style={{ color: dotColor }}>
            {STATUS_LABELS[activity.status]}
          </span>
        </div>

        {/* PIC */}
        <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
          {picName}
        </div>

        {/* Target selesai */}
        <div className="text-xs" style={{ color: isOverdue ? '#b3362a' : 'var(--text-muted)' }}>
          {formatDate(activity.end_date)}
        </div>

        {/* Task progress */}
        <div className="flex items-center gap-2">
          {taskTotal > 0 ? (
            <>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--cream-dark)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${taskPct}%`,
                    background: taskPct === 100 ? '#1e7a56' : accent,
                  }}
                />
              </div>
              <span className="text-xs font-semibold shrink-0 w-10 text-right" style={{ color: 'var(--text-muted)' }}>
                {taskDone}/{taskTotal}
              </span>
            </>
          ) : (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
          )}
        </div>
      </div>

      {/* Mobile card */}
      <div
        className="sm:hidden flex items-start gap-3 px-4 py-3 hover:bg-[--surface-2] transition-colors"
      >
        <StatusIcon size={15} className="mt-0.5 shrink-0" style={{ color: dotColor }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{activity.title}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
            <span className="text-xs" style={{ color: dotColor }}>{STATUS_LABELS[activity.status]}</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(activity.end_date)}</span>
            {picName !== '—' && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>PIC: {picName}</span>}
          </div>
          {taskTotal > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--cream-dark)' }}>
                <div className="h-full rounded-full" style={{ width: `${taskPct}%`, background: accent }} />
              </div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{taskDone}/{taskTotal}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
