import { type Activity } from '@/lib/types'
import { PriorityBadge, ControlStatusBadge } from '@/components/PriorityBadge'
import { formatDate, formatDateTime, daysSinceWIB, staleLevel } from '@/lib/utils'
import { AlertOctagon, ArrowRightCircle, Gavel, History, ShieldAlert } from 'lucide-react'

const STALE_STYLES = {
  warning:  { background: 'var(--warn-bg)', color: 'var(--warn)', border: '#eed9b4' },
  critical: { background: 'var(--bad-bg)',  color: 'var(--bad)',  border: '#efcfca' },
}

export function ActivityControlCard({ activity }: { activity: Activity }) {
  const isOpen = activity.status !== 'selesai' && activity.status !== 'ditunda'
  const lastUpdate = activity.last_substantive_update_at ?? activity.updated_at
  const staleDays = isOpen ? daysSinceWIB(lastUpdate) : 0
  const level = isOpen ? staleLevel(staleDays) : 'ok'

  const hasControlData =
    activity.control_status || activity.next_action || activity.blocker || activity.decision_needed

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(11,25,41,0.05)' }}
    >
      <div
        className="flex items-center justify-between gap-2 flex-wrap px-4 py-3"
        style={{ borderBottom: '1px solid var(--separator)' }}
      >
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--navy-50)' }}>
            <ShieldAlert size={13} style={{ color: 'var(--navy-600)' }} />
          </span>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Kendali Pekerjaan
          </span>
        </div>
        {level !== 'ok' && (
          <span
            className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border"
            style={{
              background: STALE_STYLES[level].background,
              color: STALE_STYLES[level].color,
              borderColor: STALE_STYLES[level].border,
            }}
          >
            <History size={11} />
            {staleDays} hari tanpa update substansi
          </span>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Prioritas + status kendali */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Prioritas</span>
            <PriorityBadge priority={activity.priority} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Status Kendali</span>
            {activity.control_status ? (
              <ControlStatusBadge status={activity.control_status} />
            ) : (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
            )}
          </div>
        </div>

        {/* Update substansi terakhir */}
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Update substansi terakhir:{' '}
          {activity.last_substantive_update_at ? (
            <>
              <strong style={{ color: 'var(--text-secondary)' }}>
                {formatDateTime(activity.last_substantive_update_at)}
              </strong>
              {activity.last_updater?.full_name && <> oleh <strong style={{ color: 'var(--text-secondary)' }}>{activity.last_updater.full_name}</strong></>}
            </>
          ) : (
            'belum ada'
          )}
        </p>

        {/* Decision needed — paling menonjol */}
        {activity.decision_needed && (
          <div className="rounded-xl p-3.5" style={{ background: 'var(--warn-bg)', borderLeft: '3px solid var(--warn)' }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--warn)' }}>
              <Gavel size={12} /> Butuh Keputusan Kadiv
            </p>
            <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {activity.decision_needed}
            </p>
          </div>
        )}

        {/* Blocker */}
        {activity.blocker && (
          <div className="rounded-xl p-3.5" style={{ background: 'var(--bad-bg)', borderLeft: '3px solid var(--bad)' }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--bad)' }}>
              <AlertOctagon size={12} /> Blocker
            </p>
            <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {activity.blocker}
            </p>
          </div>
        )}

        {/* Next action */}
        {activity.next_action && (
          <div className="rounded-xl p-3.5" style={{ background: 'var(--run-bg)', borderLeft: '3px solid var(--run)' }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--run)' }}>
              <ArrowRightCircle size={12} /> Next Action
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {activity.next_action}
            </p>
            {activity.next_action_due_date && (
              <p className="text-xs mt-1 font-semibold tabular-nums" style={{ color: 'var(--run)' }}>
                Target: {formatDate(activity.next_action_due_date)}
              </p>
            )}
          </div>
        )}

        {/* Empty state */}
        {!hasControlData && (
          <p className="text-sm rounded-xl p-3.5" style={{ background: 'var(--surface-2)', border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
            {isOpen
              ? 'Data kendali belum diisi. Klik Edit lalu lengkapi status kendali dan next action agar Kadiv tahu posisi pekerjaan ini tanpa harus bertanya.'
              : 'Tidak ada data kendali untuk kegiatan yang sudah ditutup.'}
          </p>
        )}
      </div>
    </div>
  )
}
