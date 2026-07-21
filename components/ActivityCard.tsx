import Link from 'next/link'
import { type Activity, DEPT_BG_COLORS } from '@/lib/types'
import { StatusBadge } from './StatusBadge'
import { formatDate, daysUntil } from '@/lib/utils'
import { CalendarDays, AlertCircle } from 'lucide-react'

export function ActivityCard({ activity }: { activity: Activity }) {
  const days      = daysUntil(activity.end_date)
  const isOverdue = days < 0 && activity.status !== 'selesai'
  const isUrgent  = days >= 0 && days <= 3 && activity.status !== 'selesai'
  const deptName  = activity.departments?.name ?? ''
  const accent    = DEPT_BG_COLORS[deptName] ?? 'var(--navy-400)'

  return (
    <Link href={`/activities/${activity.id}`}>
      <div
        className="group flex bg-white rounded-xl overflow-hidden transition-all duration-150 hover:shadow-md hover:-translate-y-px cursor-pointer"
        style={{ border: '1px solid var(--cream-border)', boxShadow: '0 1px 4px rgba(11,25,41,0.05)' }}
      >
        {/* Left accent stripe */}
        <div className="w-1 shrink-0" style={{ background: accent }} />

        <div className="flex-1 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-snug truncate" style={{ color: 'var(--text-primary)' }}>
                {activity.title}
              </p>
              {deptName && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{deptName}</p>
              )}
            </div>
            <div className="shrink-0">
              <StatusBadge status={activity.status} />
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <CalendarDays size={11} />
            <span>{formatDate(activity.start_date)} — {formatDate(activity.end_date)}</span>
          </div>

          {(isOverdue || isUrgent) && (
            <div
              className="flex items-center gap-1 mt-2 text-xs font-semibold"
              style={{ color: isOverdue ? '#b3362a' : '#a05c0a' }}
            >
              <AlertCircle size={11} />
              {isOverdue
                ? `Terlambat ${Math.abs(days)} hari`
                : `Tenggat ${days} hari lagi`}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
