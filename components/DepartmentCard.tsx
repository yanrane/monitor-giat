import Link from 'next/link'
import { type Department, type Activity, DEPT_BG_COLORS } from '@/lib/types'

export function DepartmentCard({ department, activities }: { department: Department; activities: Activity[] }) {
  const counts = {
    belum_mulai: activities.filter((a) => a.status === 'belum_mulai').length,
    berjalan:    activities.filter((a) => a.status === 'berjalan').length,
    selesai:     activities.filter((a) => a.status === 'selesai').length,
    ditunda:     activities.filter((a) => a.status === 'ditunda').length,
  }
  const total    = activities.length
  const progress = total > 0 ? Math.round((counts.selesai / total) * 100) : 0
  const accent   = DEPT_BG_COLORS[department.name] ?? '#7a8fa8'

  return (
    <Link href={`/departments/${department.id}`}>
      <div
        className="group bg-white rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
        style={{ border: '1px solid var(--cream-border)', boxShadow: '0 2px 8px rgba(11,25,41,0.06)' }}
      >
        {/* Colour accent bar */}
        <div className="h-1" style={{ background: accent }} />

        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Departemen
              </p>
              <p className="font-bold text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
                {department.name}
              </p>
            </div>
            <div
              className="shrink-0 w-10 h-10 rounded-xl flex flex-col items-center justify-center"
              style={{ background: `${accent}15` }}
            >
              <span className="text-lg font-bold leading-none" style={{ color: accent }}>{total}</span>
              <span className="text-[9px] font-semibold mt-0.5" style={{ color: accent }}>giat</span>
            </div>
          </div>

          {/* Progress bar */}
          {total > 0 && (
            <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden mb-3">
              {counts.selesai > 0 && (
                <div className="transition-all" style={{ flex: counts.selesai, background: '#059669' }} />
              )}
              {counts.berjalan > 0 && (
                <div className="transition-all" style={{ flex: counts.berjalan, background: '#d97706' }} />
              )}
              {counts.belum_mulai > 0 && (
                <div className="transition-all" style={{ flex: counts.belum_mulai, background: '#3b82f6' }} />
              )}
              {counts.ditunda > 0 && (
                <div className="transition-all" style={{ flex: counts.ditunda, background: '#dc2626' }} />
              )}
            </div>
          )}
          {total === 0 && (
            <div className="h-1.5 rounded-full mb-3" style={{ background: 'var(--cream-dark)' }} />
          )}

          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {[
              { dot: '#3b82f6', label: 'Belum mulai', count: counts.belum_mulai },
              { dot: '#d97706', label: 'Berjalan',    count: counts.berjalan    },
              { dot: '#059669', label: 'Selesai',     count: counts.selesai     },
              { dot: '#dc2626', label: 'Ditunda',     count: counts.ditunda     },
            ].map(({ dot, label, count }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dot }} />
                <span>{count} {label.toLowerCase()}</span>
              </div>
            ))}
          </div>

          {total > 0 && (
            <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--cream-border)' }}>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Selesai</span>
              <span className="text-xs font-bold" style={{ color: accent }}>{progress}%</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
