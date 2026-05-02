import { type ActivityStatus, STATUS_LABELS } from '@/lib/types'

const CONFIG: Record<ActivityStatus, { dot: string; cls: string }> = {
  belum_mulai: { dot: '#3b82f6', cls: 'status-belum_mulai' },
  berjalan:    { dot: '#d97706', cls: 'status-berjalan' },
  selesai:     { dot: '#059669', cls: 'status-selesai' },
  ditunda:     { dot: '#dc2626', cls: 'status-ditunda' },
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
