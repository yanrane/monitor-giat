import { type Activity } from '@/lib/types'
import { TrendingUp } from 'lucide-react'
import { wibDateStr } from '@/lib/utils'

// Tren kegiatan selesai per bulan (6 bulan terakhir, per target end_date).
// SVG murni server-side — tanpa library chart; hover = <title> native.
export function CompletionTrend({ activities }: { activities: Activity[] }) {
  const now = new Date(wibDateStr())
  const months: { key: string; label: string; count: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months.push({
      key,
      label: d.toLocaleDateString('id-ID', { month: 'short' }),
      count: 0,
    })
  }
  for (const a of activities) {
    if (a.status !== 'selesai' || !a.end_date) continue
    const k = a.end_date.slice(0, 7)
    const m = months.find((x) => x.key === k)
    if (m) m.count++
  }

  const max = Math.max(...months.map((m) => m.count), 1)

  // Geometri: viewBox 600×150, plot 110px tinggi, bar tipis ujung atas membulat
  const W = 600, H = 150, PLOT_H = 104, BASE = 122, BAR_W = 30
  const step = W / months.length

  return (
    <section
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(11,25,41,0.05)' }}
    >
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--separator)' }}>
        <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--ok-bg)' }}>
          <TrendingUp size={13} style={{ color: 'var(--ok)' }} />
        </span>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Kegiatan selesai per bulan
        </h2>
        <span className="ml-auto text-xs" style={{ color: 'var(--text-tertiary)' }}>
          6 bulan terakhir · per target selesai
        </span>
      </div>

      <div className="px-4 pt-3 pb-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
          aria-label={`Kegiatan selesai per bulan: ${months.map((m) => `${m.label} ${m.count}`).join(', ')}`}>
          {/* grid samar */}
          {[0.5, 1].map((f) => (
            <line key={f} x1="0" x2={W} y1={BASE - PLOT_H * f} y2={BASE - PLOT_H * f}
              stroke="var(--separator)" strokeWidth="1" />
          ))}
          <line x1="0" x2={W} y1={BASE} y2={BASE} stroke="var(--border)" strokeWidth="1" />

          {months.map((m, i) => {
            const h = Math.round((m.count / max) * PLOT_H)
            const x = i * step + (step - BAR_W) / 2
            const y = BASE - h
            const isCurrent = i === months.length - 1
            const fill = isCurrent ? 'var(--brass)' : 'var(--navy-600)'
            return (
              <g key={m.key}>
                <title>{`${m.label}: ${m.count} kegiatan selesai`}</title>
                {m.count > 0 && (
                  <>
                    {/* bar ujung atas membulat, pangkal rata di baseline */}
                    <rect x={x} y={y} width={BAR_W} height={h} rx="4" fill={fill} />
                    {h > 4 && <rect x={x} y={BASE - 4} width={BAR_W} height={4} fill={fill} />}
                  </>
                )}
                <text x={x + BAR_W / 2} y={y - 7} textAnchor="middle"
                  fontSize="12.5" fontWeight="600" fill="var(--text-secondary)"
                  style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {m.count}
                </text>
                <text x={x + BAR_W / 2} y={BASE + 18} textAnchor="middle"
                  fontSize="11.5" fill={isCurrent ? 'var(--brass-deep)' : 'var(--text-muted)'}
                  fontWeight={isCurrent ? 600 : 400}>
                  {m.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </section>
  )
}
