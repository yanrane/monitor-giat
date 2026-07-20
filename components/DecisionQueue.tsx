import Link from 'next/link'
import { type Activity, CONTROL_STATUS_LABELS, DEPT_BG_COLORS } from '@/lib/types'
import { PriorityBadge } from '@/components/PriorityBadge'
import { formatDate } from '@/lib/utils'
import { Gavel } from 'lucide-react'

const GRID = '90px 1fr 130px 110px 160px'

export function DecisionQueue({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) return null

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(11,25,41,0.05)' }}
    >
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: '1px solid var(--separator)' }}
      >
        <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: '#f3ebfb' }}>
          <Gavel size={13} style={{ color: '#6d4fc4' }} />
        </span>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Menunggu keputusan Kadiv
        </span>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-md tabular-nums"
          style={{ background: '#f3ebfb', color: '#6d4fc4', border: '1px solid #e0d3f5' }}
        >
          {activities.length}
        </span>
        <span className="text-xs ml-auto hidden sm:block" style={{ color: 'var(--text-tertiary)' }}>
          kegiatan yang menunggu keputusan Anda
        </span>
      </div>

      {/* Column headers */}
      <div
        className="hidden sm:grid text-xs font-semibold uppercase tracking-wider px-4 py-2 gap-3"
        style={{
          gridTemplateColumns: GRID,
          color: 'var(--text-muted)',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--cream-border)',
        }}
      >
        <span>Prioritas</span>
        <span>Kegiatan &amp; Keputusan Dibutuhkan</span>
        <span>Departemen</span>
        <span>PIC</span>
        <span>Next Action</span>
      </div>

      <div className="bg-white divide-y divide-[--cream-border]">
        {activities.map((act) => {
          const deptName = act.departments?.name ?? ''
          const accent   = DEPT_BG_COLORS[deptName] ?? '#7a8fa8'
          const decision = act.decision_needed
            ?? (act.control_status ? CONTROL_STATUS_LABELS[act.control_status] : '')
          return (
            <Link
              key={act.id}
              href={`/activities/${act.id}`}
              className="flex sm:grid items-start sm:items-center gap-3 px-4 py-3 hover:bg-purple-50/30 transition-colors"
              style={{ gridTemplateColumns: GRID }}
            >
              <div className="shrink-0 pt-0.5 sm:pt-0">
                <PriorityBadge priority={act.priority} compact />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {act.title}
                </p>
                <p className="text-xs mt-0.5 line-clamp-2 font-medium" style={{ color: '#92400e' }}>
                  {decision}
                </p>
                <p className="text-xs sm:hidden mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {deptName}{act.pic?.full_name ? ` · PIC: ${act.pic.full_name}` : ''}
                  {act.next_action_due_date ? ` · Target: ${formatDate(act.next_action_due_date)}` : ''}
                </p>
              </div>
              <p className="hidden sm:block text-xs truncate font-medium" style={{ color: accent }}>
                {deptName}
              </p>
              <p className="hidden sm:block text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                {act.pic?.full_name ?? '—'}
              </p>
              <div className="hidden sm:block min-w-0">
                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                  {act.next_action ?? '—'}
                </p>
                {act.next_action_due_date && (
                  <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--blue-dark)' }}>
                    {formatDate(act.next_action_due_date)}
                  </p>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
