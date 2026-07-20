import {
  type ActivityPriority,
  type ControlStatus,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  CONTROL_STATUS_COLORS,
  CONTROL_STATUS_LABELS,
} from '@/lib/types'

export function PriorityBadge({ priority, compact = false }: { priority: ActivityPriority; compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap ${PRIORITY_COLORS[priority]}`}
    >
      {compact ? priority.toUpperCase() : PRIORITY_LABELS[priority]}
    </span>
  )
}

export function ControlStatusBadge({ status }: { status: ControlStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${CONTROL_STATUS_COLORS[status]}`}
    >
      {CONTROL_STATUS_LABELS[status]}
    </span>
  )
}
