import { Landmark, ChevronDown } from 'lucide-react'
import { CAPEX_ITEMS, CAPEX_TITLE, CAPEX_TOTAL, CAPEX_YEAR } from './capex'

function formatRupiah(amount: number) {
  return 'Rp ' + amount.toLocaleString('id-ID')
}

// totalSpent = realisasi pengeluaran CAPEX (expenses budget_type='capex')
export function CapexCard({ totalSpent = 0 }: { totalSpent?: number }) {
  const sisa = CAPEX_TOTAL - totalSpent
  const pctUsed = Math.min(100, Math.round((totalSpent / CAPEX_TOTAL) * 100))
  const overBudget = sisa < 0
  const barColor = overBudget ? '#dc2626' : pctUsed >= 80 ? '#d97706' : '#059669'

  return (
    <div
      className="rounded-2xl overflow-hidden bg-white"
      style={{ border: '1px solid var(--cream-border)', boxShadow: '0 2px 8px rgba(11,25,41,0.06)' }}
    >
      {/* Header: pagu − realisasi = sisa */}
      <div className="px-4 py-3 space-y-3" style={{ background: 'var(--navy-900)', color: 'white' }}>
        <div className="flex items-center gap-2.5">
          <Landmark size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
          <div>
            <p className="text-sm font-semibold leading-tight">{CAPEX_TITLE}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{CAPEX_YEAR}</p>
          </div>
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Pagu Anggaran CAPEX</p>
            <p className="text-base font-bold tabular-nums">{formatRupiah(CAPEX_TOTAL)}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Total Pengeluaran ({pctUsed}%)</p>
            <p className="text-base font-bold tabular-nums">− {formatRupiah(totalSpent)}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Sisa Anggaran CAPEX</p>
            <p className="text-lg font-bold tabular-nums" style={{ color: overBudget ? '#fca5a5' : '#6ee7b7' }}>
              {overBudget ? `− ${formatRupiah(Math.abs(sisa))}` : formatRupiah(sisa)}
            </p>
          </div>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pctUsed}%`, background: barColor }} />
        </div>
        {overBudget && (
          <p className="text-xs" style={{ color: '#fca5a5' }}>⚠️ Pengeluaran CAPEX sudah melewati pagu</p>
        )}
      </div>

      {/* Rincian item pagu (dropdown) */}
      <details className="group">
        <summary
          className="flex items-center justify-between px-4 py-3 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden transition-colors hover:bg-gray-50"
        >
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Rincian Pagu per Item ({CAPEX_ITEMS.length})
          </span>
          <ChevronDown
            size={16}
            className="shrink-0 transition-transform group-open:rotate-180"
            style={{ color: 'var(--text-muted)' }}
          />
        </summary>
        <div className="divide-y divide-[--cream-border]" style={{ borderTop: '1px solid var(--cream-border)' }}>
          {CAPEX_ITEMS.map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <p className="text-sm min-w-0" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
              <p className="text-sm font-semibold shrink-0" style={{ color: 'var(--navy-900)' }}>
                {formatRupiah(item.amount)}
              </p>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
