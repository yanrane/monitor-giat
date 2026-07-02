import { Landmark } from 'lucide-react'
import { CAPEX_ITEMS, CAPEX_TITLE, CAPEX_TOTAL, CAPEX_YEAR } from './capex'

function formatRupiah(amount: number) {
  return 'Rp ' + amount.toLocaleString('id-ID')
}

export function CapexCard() {
  return (
    <div
      className="rounded-2xl overflow-hidden bg-white"
      style={{ border: '1px solid var(--cream-border)', boxShadow: '0 2px 8px rgba(11,25,41,0.06)' }}
    >
      {/* Header */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
        style={{ background: 'var(--navy-900)', color: 'white' }}
      >
        <div className="flex items-center gap-2.5">
          <Landmark size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
          <div>
            <p className="text-sm font-semibold leading-tight">{CAPEX_TITLE}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{CAPEX_YEAR}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Pagu CAPEX</p>
          <p className="text-base font-bold">{formatRupiah(CAPEX_TOTAL)}</p>
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-[--cream-border]">
        {CAPEX_ITEMS.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <p className="text-sm min-w-0" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
            <p className="text-sm font-semibold shrink-0" style={{ color: 'var(--navy-900)' }}>
              {formatRupiah(item.amount)}
            </p>
          </div>
        ))}
      </div>

      {/* Total */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: 'var(--surface)', borderTop: '1px solid var(--cream-border)' }}
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Total Anggaran CAPEX</span>
        <span className="text-base font-bold" style={{ color: 'var(--navy-900)' }}>{formatRupiah(CAPEX_TOTAL)}</span>
      </div>
    </div>
  )
}
