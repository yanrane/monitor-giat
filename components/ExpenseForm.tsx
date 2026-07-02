'use client'

import { useState, useRef } from 'react'
import { Plus, Loader2, ChevronDown } from 'lucide-react'
import { addExpense } from '@/app/(protected)/expenses/actions'
import { type ExpenseCategory, EXPENSE_CATEGORY_LABELS } from '@/lib/types'

const CATEGORIES: ExpenseCategory[] = ['tiket', 'honor', 'hotel', 'lainnya']

export function ExpenseForm() {
  const [open, setOpen]     = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const formRef             = useRef<HTMLFormElement>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await addExpense(formData)
    setLoading(false)
    if (result?.error) {
      setError(result.error)
    } else {
      formRef.current?.reset()
      setOpen(false)
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--cream-border)', background: 'white' }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--blue-light)' }}
          >
            <Plus size={14} style={{ color: 'var(--blue)' }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Input Pengeluaran Baru
          </span>
        </div>
        <ChevronDown
          size={16}
          style={{
            color: 'var(--text-muted)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {open && (
        <form
          ref={formRef}
          action={handleSubmit}
          className="px-5 pb-5 space-y-4"
          style={{ borderTop: '1px solid var(--cream-border)' }}
        >
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Jenis Anggaran */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Jenis Anggaran *
              </label>
              <select
                name="budget_type"
                required
                defaultValue="opex"
                className="w-full text-sm px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-400"
                style={{ border: '1px solid var(--cream-border)', background: 'var(--surface)' }}
              >
                <option value="opex">OPEX — Operasional</option>
                <option value="capex">CAPEX — Perpanjangan & Pembaharuan HGB</option>
              </select>
            </div>

            {/* Tanggal */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Tanggal *
              </label>
              <input
                name="expense_date"
                type="date"
                required
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full text-sm px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-400"
                style={{ border: '1px solid var(--cream-border)', background: 'var(--surface)' }}
              />
            </div>

            {/* Kategori */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Kategori *
              </label>
              <select
                name="category"
                required
                className="w-full text-sm px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-400"
                style={{ border: '1px solid var(--cream-border)', background: 'var(--surface)' }}
              >
                <option value="">— Pilih kategori —</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>

            {/* Keterangan */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Keterangan *
              </label>
              <input
                name="description"
                placeholder="Contoh: Tiket pesawat Jakarta-Pangkalpinang PP"
                required
                className="w-full text-sm px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-400"
                style={{ border: '1px solid var(--cream-border)', background: 'var(--surface)' }}
              />
            </div>

            {/* Nama penerima (opsional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Nama Penerima
              </label>
              <input
                name="recipient_name"
                placeholder="Nama penerima honor / vendor"
                className="w-full text-sm px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-400"
                style={{ border: '1px solid var(--cream-border)', background: 'var(--surface)' }}
              />
            </div>

            {/* Jumlah */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Jumlah (Rp) *
              </label>
              <input
                name="amount"
                type="number"
                min="0"
                step="1000"
                placeholder="0"
                required
                className="w-full text-sm px-3 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-400"
                style={{ border: '1px solid var(--cream-border)', background: 'var(--surface)' }}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium px-3 py-2 rounded-lg" style={{ background: '#fef2f2', color: '#dc2626' }}>
              {error}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: '#3b82f6' }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Simpan Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setError(null) }}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-gray-100"
              style={{ color: 'var(--text-muted)' }}
            >
              Batal
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
