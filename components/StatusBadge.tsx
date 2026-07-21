import { type ActivityStatus, STATUS_LABELS } from '@/lib/types'

const CONFIG: Record<ActivityStatus, { dot: string; cls: string }> = {
  belum_mulai: { dot: '#2458a6', cls: 'status-belum_mulai' },
  berjalan:    { dot: '#a05c0a', cls: 'status-berjalan' },
  selesai:     { dot: '#1e7a56', cls: 'status-selesai' },
  ditunda:     { dot: '#b3362a', cls: 'status-ditunda' },
}

export function StatusBadge({ status }: { status: ActivityStatus }) {
  const { dot, cls } = CONFIG[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${cls}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: dot }}
      />
      {STATUS_LABELS[status]}
    </span>
  )
}
