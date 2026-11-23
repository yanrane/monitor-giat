export interface BatterySegment {
  label: string
  n: number
  color: string
}

export function BatteryLegend({ segments }: { segments: BatterySegment[] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
      {segments.filter((s) => s.n > 0).map((s) => (
        <span key={s.label}>
          <i className="inline-block w-2 h-2 rounded-sm mr-1 align-baseline" style={{ background: s.color }} />
          {s.n} {s.label}
        </span>
      ))}
    </div>
  )
}

// Bar sebaran status ala "battery" monday.com; segmen kosong dibuang
export function StatusBattery({ segments, showLegend = true }: {
  segments: BatterySegment[]
  showLegend?: boolean
}) {
  const parts = segments.filter((s) => s.n > 0)
  const total = parts.reduce((sum, s) => sum + s.n, 0)
  if (total === 0) return null

  return (
    <div className="space-y-1.5">
      <div
        className="flex h-2.5 rounded-full overflow-hidden"
        style={{ background: 'var(--separator)' }}
        role="img"
        aria-label={parts.map((s) => `${s.n} ${s.label}`).join(', ')}
      >
        {parts.map((s) => (
          <div key={s.label} title={`${s.label}: ${s.n}`} style={{ width: `${(s.n / total) * 100}%`, background: s.color }} />
        ))}
      </div>
      {showLegend && <BatteryLegend segments={parts} />}
    </div>
  )
}
