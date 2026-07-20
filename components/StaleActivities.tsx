import Link from 'next/link'
import { type Activity, DEPT_BG_COLORS } from '@/lib/types'
import { History, ArrowRight } from 'lucide-react'

export interface StaleActivity {
  activity: Activity
  days: number
  level: 'warning' | 'critical'
}

const LEVEL = {
  warning:  { stripe: 'var(--warn)', text: 'var(--warn)', bg: 'var(--warn-bg)', border: '#eed9b4' },
  critical: { stripe: 'var(--bad)',  text: 'var(--bad)',  bg: 'var(--bad-bg)',  border: '#efcfca' },
}

export function StaleActivities({ items }: { items: StaleActivity[] }) {
  if (items.length === 0) return null

  const critical = items.filter((i) => i.level === 'critical').length

  return (
    <section
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(11,25,41,0.05)' }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--separator)' }}>
        <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--warn-bg)' }}>
          <History size={13} style={{ color: 'var(--warn)' }} />
        </span>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Kegiatan tanpa update substansi
        </h2>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-md tabular-nums"
          style={{ background: 'var(--warn-bg)', color: 'var(--warn)', border: '1px solid #eed9b4' }}
        >
          {items.length}
        </span>
        {critical > 0 && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-md tabular-nums"
            style={{ background: 'var(--bad-bg)', color: 'var(--bad)', border: '1px solid #efcfca' }}
          >
            {critical} kritis · 14+ hari
          </span>
        )}
        <span className="ml-auto hidden sm:block text-xs" style={{ color: 'var(--text-tertiary)' }}>
          diurutkan dari yang paling lama
        </span>
      </div>

      {/* Rows */}
      <div className="divide-y" style={{ borderColor: 'var(--separator)' }}>
        {items.map(({ activity: act, days, level }) => {
          const deptName = act.departments?.name ?? ''
          const accent   = DEPT_BG_COLORS[deptName] ?? '#7a8fa8'
          const s        = LEVEL[level]
          // Bar penuaan: penuh di 30 hari
          const agePct   = Math.min(days / 30, 1) * 100
          return (
            <Link
              key={act.id}
              href={`/activities/${act.id}`}
              className="group flex items-stretch gap-3.5 px-4 py-3 transition-colors hover:bg-[--surface-2]"
            >
              <span className="w-[3px] rounded-full shrink-0 self-stretch" style={{ background: s.stripe }} />

              {/* Kegiatan + meta */}
              <span className="flex-1 min-w-0 py-0.5">
                <p className="text-sm font-medium leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                  {act.title}
                </p>
                <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 text-xs">
                  <span className="font-medium" style={{ color: accent }}>{deptName}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{act.pic?.full_name ?? 'PIC belum ditetapkan'}</span>
                  {act.next_action && (
                    <span className="hidden sm:inline-flex items-center gap-1 truncate max-w-[320px]" style={{ color: 'var(--text-secondary)' }}>
                      <ArrowRight size={11} style={{ color: 'var(--text-tertiary)' }} />
                      {act.next_action}
                    </span>
                  )}
                </span>
              </span>

              {/* Umur tanpa update */}
              <span className="shrink-0 self-center text-right w-[92px]">
                <span
                  className="inline-block text-xs font-bold px-2 py-0.5 rounded-md tabular-nums"
                  style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
                >
                  {days} hari
                </span>
                <span className="block h-1 mt-1.5 rounded-full overflow-hidden" style={{ background: 'var(--separator)' }}>
                  <span className="block h-full rounded-full" style={{ width: `${agePct}%`, background: s.stripe }} />
                </span>
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
