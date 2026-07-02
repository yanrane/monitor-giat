'use client'

import { useState } from 'react'
import { Trash2, Loader2, Plane, Users, Hotel, MoreHorizontal, Landmark } from 'lucide-react'
import { type Expense, type ExpenseCategory, EXPENSE_CATEGORY_LABELS, EXPENSE_CATEGORY_COLORS } from '@/lib/types'
import { deleteExpense } from '@/app/(protected)/expenses/actions'

interface ExpenseTableProps {
  expenses: Expense[]
  isKadiv: boolean
  currentUserId: string
  // sembunyikan kartu ringkasan kategori + baris total (dipakai di seksi CAPEX
  // yang sudah punya panel pagu/realisasi sendiri)
  hideSummary?: boolean
  emptyText?: string
}

const CATEGORY_ICONS: Record<ExpenseCategory, React.ElementType> = {
  tiket: Plane,
  honor: Users,
  hotel: Hotel,
  lainnya: MoreHorizontal,
}

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ExpenseTable({ expenses, isKadiv, currentUserId, hideSummary = false, emptyText }: ExpenseTableProps) {
  const [loading, setLoading] = useState<string | null>(null)

  async function handleDelete(expenseId: string, description: string) {
    if (!confirm(`Hapus pengeluaran "${description}"?`)) return
    setLoading(expenseId)
    await deleteExpense(expenseId)
    setLoading(null)
  }

  // Summary per category
  const summary: Record<ExpenseCategory, number> = { tiket: 0, honor: 0, hotel: 0, lainnya: 0 }
  for (const e of expenses) {
    summary[e.category as ExpenseCategory] += e.amount
  }
  const grandTotal = Object.values(summary).reduce((a, b) => a + b, 0)

  if (expenses.length === 0) {
    return (
      <div
        className="rounded-2xl px-4 py-10 text-center"
        style={{ border: '1px solid var(--cream-border)', background: 'white' }}
      >
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{emptyText ?? 'Belum ada data pengeluaran.'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary cards + grand total */}
      {!hideSummary && (
      <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(Object.keys(summary) as ExpenseCategory[]).map((cat) => {
          const Icon  = CATEGORY_ICONS[cat]
          const color = EXPENSE_CATEGORY_COLORS[cat]
          return (
            <div
              key={cat}
              className="rounded-xl p-3"
              style={{ background: 'white', border: '1px solid var(--cream-border)' }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Icon size={13} style={{ color }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  {EXPENSE_CATEGORY_LABELS[cat]}
                </span>
              </div>
              <p className="text-sm font-bold" style={{ color }}>
                {formatRupiah(summary[cat])}
              </p>
            </div>
          )
        })}
      </div>

      {/* Grand total */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-xl"
        style={{ background: 'var(--navy-900)', color: 'white' }}
      >
        <span className="text-sm font-semibold">Total Pengeluaran</span>
        <span className="text-base font-bold">{formatRupiah(grandTotal)}</span>
      </div>
      </>
      )}

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--cream-border)' }}
      >
        {/* Headers (desktop) */}
        <div
          className="hidden sm:grid text-xs font-semibold uppercase tracking-wider px-4 py-2.5"
          style={{
            gridTemplateColumns: '90px 1fr 1fr 120px 120px 40px',
            color: 'var(--text-muted)',
            background: 'var(--surface)',
            borderBottom: '1px solid var(--cream-border)',
          }}
        >
          <span>Tanggal</span>
          <span>Keterangan</span>
          <span>Penerima</span>
          <span>Kategori</span>
          <span className="text-right">Jumlah</span>
          <span />
        </div>

        <div className="bg-white divide-y divide-[--cream-border]">
          {expenses.map((expense) => {
            // Baris CAPEX: kategori tampil "Pengurusan HGB", keterangan tidak dipotong
            const isCapex = expense.budget_type === 'capex'
            const Icon  = isCapex ? Landmark : CATEGORY_ICONS[expense.category as ExpenseCategory]
            const color = isCapex ? '#475569' : EXPENSE_CATEGORY_COLORS[expense.category as ExpenseCategory]
            const catLabel = isCapex ? 'Pengurusan HGB' : EXPENSE_CATEGORY_LABELS[expense.category as ExpenseCategory]
            const canDel = isKadiv || expense.created_by === currentUserId

            return (
              <div key={expense.id} className="group">
                {/* Desktop row */}
                <div
                  className="hidden sm:grid items-center px-4 py-3 hover:bg-gray-50 transition-colors"
                  style={{ gridTemplateColumns: '90px 1fr 1fr 120px 120px 40px' }}
                >
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(expense.expense_date)}
                  </span>
                  <span
                    className={`text-sm pr-3 ${isCapex ? '' : 'truncate'}`}
                    title={expense.description}
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {expense.description}
                  </span>
                  <span className="text-xs truncate pr-3" style={{ color: 'var(--text-muted)' }}>
                    {expense.recipient_name ?? '—'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Icon size={12} style={{ color }} />
                    <span className="text-xs font-medium" style={{ color }}>
                      {catLabel}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-right" style={{ color: 'var(--text-primary)' }}>
                    {formatRupiah(expense.amount)}
                  </span>
                  <div className="flex justify-end">
                    {canDel && (
                      <button
                        onClick={() => handleDelete(expense.id, expense.description)}
                        disabled={loading === expense.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-70"
                      >
                        {loading === expense.id
                          ? <Loader2 size={14} className="animate-spin" style={{ color: '#dc2626' }} />
                          : <Trash2 size={14} style={{ color: '#dc2626' }} />
                        }
                      </button>
                    )}
                  </div>
                </div>

                {/* Mobile card */}
                <div className="sm:hidden px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isCapex ? '' : 'truncate'}`} style={{ color: 'var(--text-primary)' }}>
                        {expense.description}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(expense.expense_date)}</span>
                        <span className="flex items-center gap-1 text-xs" style={{ color }}>
                          <Icon size={11} />
                          {catLabel}
                        </span>
                        {expense.recipient_name && (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{expense.recipient_name}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {formatRupiah(expense.amount)}
                      </p>
                      {canDel && (
                        <button
                          onClick={() => handleDelete(expense.id, expense.description)}
                          disabled={loading === expense.id}
                          className="mt-1 hover:opacity-70"
                        >
                          {loading === expense.id
                            ? <Loader2 size={13} className="animate-spin" style={{ color: '#dc2626' }} />
                            : <Trash2 size={13} style={{ color: '#dc2626' }} />
                          }
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
