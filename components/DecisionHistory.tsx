import { type ActivityDecision, DECISION_ACTION_LABELS } from '@/lib/types'
import { ControlStatusBadge } from '@/components/PriorityBadge'
import { formatDate, formatDateTime } from '@/lib/utils'
import { Gavel } from 'lucide-react'

export function DecisionHistory({ decisions }: { decisions: ActivityDecision[] }) {
  if (decisions.length === 0) return null

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(11,25,41,0.05)' }}
    >
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--separator)' }}>
        <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: '#f3ebfb' }}>
          <Gavel size={13} style={{ color: '#6d4fc4' }} />
        </span>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Riwayat Keputusan Kadiv
        </span>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-md tabular-nums"
          style={{ background: '#f3ebfb', color: '#6d4fc4', border: '1px solid #e0d3f5' }}
        >
          {decisions.length}
        </span>
      </div>

      <div className="bg-white divide-y divide-[--cream-border]">
        {decisions.map((d) => (
          <div key={d.id} className="px-4 py-3 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: '#6d4fc4' }}>
                {DECISION_ACTION_LABELS[d.action]}
              </span>
              <ControlStatusBadge status={d.resulting_control_status} />
              <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
                {formatDateTime(d.created_at)}
                {d.decider?.full_name ? ` · ${d.decider.full_name}` : ''}
              </span>
            </div>
            {d.decision_needed_snapshot && (
              <p className="text-xs whitespace-pre-wrap" style={{ color: 'var(--text-muted)' }}>
                Atas permintaan: {d.decision_needed_snapshot}
              </p>
            )}
            <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {d.instruction}
            </p>
            {(d.next_action || d.next_action_due_date) && (
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Next action: {d.next_action ?? '—'}
                {d.next_action_due_date && (
                  <span className="font-semibold" style={{ color: 'var(--blue-dark)' }}>
                    {' '}(target {formatDate(d.next_action_due_date)})
                  </span>
                )}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
