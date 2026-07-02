'use client'

import { useState } from 'react'
import { Loader2, Pencil, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { setBudget } from './budget-actions'

function formatRupiah(amount: number) {
  return 'Rp ' + amount.toLocaleString('id-ID')
}

interface BudgetCardProps {
  pagu: number | null
  totalSpent: number
  // false = strip ringkas (pagu + tombol edit saja, tanpa sisa) — untuk staf,
  // karena data pengeluaran yang mereka lihat cuma slice dept-nya sendiri.
  showRemaining?: boolean
  children?: React.ReactNode
}

export function BudgetCard({ pagu, totalSpent, showRemaining = true, children }: BudgetCardProps) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(pagu ? String(pagu) : '')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    const fd = new FormData()
    fd.set('pagu', value)
    await setBudget(fd)
    setLoading(false)
    setOpen(false)
  }

  const sisa = pagu !== null ? pagu - totalSpent : null
  const pctUsed = pagu ? Math.min(100, Math.round((totalSpent / pagu) * 100)) : 0
  const overBudget = sisa !== null && sisa < 0
  const barColor = overBudget ? '#dc2626' : pctUsed >= 80 ? '#d97706' : '#059669'

  const editDialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
          style={{ color: 'rgba(255,255,255,0.7)' }}
          title="Atur pagu anggaran"
        >
          <Pencil size={14} />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atur Pagu Anggaran OPEX Divisi Hukum</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label>Pagu total (Rp)</Label>
            <input
              type="text"
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
              placeholder="cth: 2000000000"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {value && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                = {formatRupiah(Number(value))}
              </p>
            )}
          </div>
          <Button onClick={handleSave} disabled={loading || !value} className="w-full">
            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Simpan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )

  if (!showRemaining) {
    return (
      <div
        className="rounded-2xl px-4 py-3 flex items-center justify-between"
        style={{ background: 'var(--navy-900)', color: 'white' }}
      >
        <div className="flex items-center gap-2.5">
          <Wallet size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
          <span className="text-sm">
            Pagu Anggaran OPEX Divisi: {pagu !== null ? <strong>{formatRupiah(pagu)}</strong> : 'belum diatur'}
          </span>
        </div>
        {editDialog}
      </div>
    )
  }

  if (pagu === null) {
    return (
      <div
        className="rounded-2xl px-4 py-3 flex items-center justify-between"
        style={{ background: 'var(--navy-900)', color: 'white' }}
      >
        <div className="flex items-center gap-2.5">
          <Wallet size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
          <span className="text-sm">Pagu anggaran OPEX belum diatur — klik pensil untuk mengisi</span>
        </div>
        {editDialog}
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{ background: 'var(--navy-900)', color: 'white' }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Pagu Anggaran OPEX</p>
            <p className="text-base font-bold">{formatRupiah(pagu)}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Total Pengeluaran ({pctUsed}%)</p>
            <p className="text-base font-bold">− {formatRupiah(totalSpent)}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Sisa Anggaran OPEX</p>
            <p className="text-lg font-bold" style={{ color: overBudget ? '#fca5a5' : '#6ee7b7' }}>
              {overBudget ? `− ${formatRupiah(Math.abs(sisa!))}` : formatRupiah(sisa!)}
            </p>
          </div>
        </div>
        {editDialog}
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pctUsed}%`, background: barColor }}
        />
      </div>
      {overBudget && (
        <p className="text-xs" style={{ color: '#fca5a5' }}>
          ⚠️ Pengeluaran sudah melewati pagu anggaran
        </p>
      )}
      {children && (
        <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          {children}
        </div>
      )}
    </div>
  )
}
