import Link from 'next/link'
import { type Activity, DEPT_BG_COLORS } from '@/lib/types'
import { History } from 'lucide-react'

export interface StaleActivity {
  activity: Activity
  days: number
  level: 'warning' | 'critical'
}

const GRID = '1fr 130px 110px 110px 160px'

const LEVEL_STYLES = {
  warning:  { bar: '#d97706', badgeBg: '#fffbeb', badgeText: '#92400e' },
  critical: { bar: '#dc2626', badgeBg: '#fef2f2', badgeText: '#991b1b' },
}

export function StaleActivities({ items }: { items: StaleActivity[] }) {
  if (items.length === 0) return null

  const critical = items.filter((i) => i.level === 'critical').length

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid #fde68a', boxShadow: '0 2px 8px rgba(217,119,6,0.08)' }}
    >
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a' }}
      >
        <History size={14} style={{ color: '#92400e' }} />
        <span className="text-sm font-bold" style={{ color: '#92400e' }}>
          Kegiatan Tanpa Update Substansi
        </span>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: '#92400e18', color: '#92400e' }}
        >
          {items.length}
        </span>
        {critical > 0 && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: '#fef2f2', color: '#dc2626' }}
          >
            {critical} kritis (14+ hari)
          </span>
        )}
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
        <span>Kegiatan</span>
        <span>Departemen</span>
        <span>PIC</span>
        <span>Tanpa Update</span>
        <span>Next Action</span>
      </div>

      <div className="bg-white divide-y divide-[--cream-border]">
        {items.map(({ activity: act, days, level }) => {
          const deptName = act.departments?.name ?? ''
          const accent   = DEPT_BG_COLORS[deptName] ?? '#7a8fa8'
          const styles   = LEVEL_STYLES[level]
          return (
            <Link
              key={act.id}
              href={`/activities/${act.id}`}
              className="flex sm:grid items-start sm:items-center gap-3 px-4 py-3 hover:bg-amber-50/40 transition-colors"
              style={{ gridTemplateColumns: GRID }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-0.5 h-7 rounded-full shrink-0" style={{ background: styles.bar }} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {act.title}
                  </p>
                  <p className="text-xs sm:hidden mt-0.5" style={{ color: styles.badgeText }}>
                    {days} hari tanpa update · {deptName}
                  </p>
                </div>
              </div>
              <p className="hidden sm:block text-xs truncate font-medium" style={{ color: accent }}>
                {deptName}
              </p>
              <p className="hidden sm:block text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                {act.pic?.full_name ?? '—'}
              </p>
              <span
                className="hidden sm:inline-flex w-fit text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: styles.badgeBg, color: styles.badgeText }}
              >
                {days} hari
              </span>
              <p className="hidden sm:block text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                {act.next_action ?? '—'}
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
