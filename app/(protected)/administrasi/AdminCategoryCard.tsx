'use client'

import { useState, useRef } from 'react'
import { Plus, Loader2, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { type Expense } from '@/lib/types'
import { addAdminExpense, deleteAdminExpense } from './actions'

interface AdminCategoryCardProps {
  category: string
  label: string
  icon: React.ReactNode
  color: string
  bg: string
  borderColor: string
  expenses: Expense[]
  canInput: boolean
  isKadiv: boolean
  currentUserId: string
}

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(amount)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function AdminCategoryCard({
  category, label, icon, color, bg, borderColor,
  expenses, canInput, isKadiv, currentUserId,
}: AdminCategoryCardProps) {
  const [adding, setAdding]   = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)
  const formRef               = useRef<HTMLFormElement>(null)

  const total      = expenses.reduce((s, e) => s + e.amount, 0)
  const recentList = expenses.slice(0, 5)
  const hasMore    = expenses.length > 5

  async function handleAdd(formData: FormData) {
    formData.set('category', category)
    setLoading('add')
    setError(null)
    const result = await addAdminExpense(formData)
    setLoading(null)
    if (result?.error) {
      setError(result.error)
    } else {
      formRef.current?.reset()
      formRef.current?.querySelector<HTMLInputElement>('[name="expense_date"]')
      setAdding(false)
    }
  }

  async function handleDelete(expenseId: string, description: string) {
    if (!confirm(`Hapus "${description}"?`)) return
    setLoading(expenseId)
    await deleteAdminExpense(expenseId)
    setLoading(null)
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${borderColor}`, boxShadow: '0 2px 8px rgba(11,25,41,0.06)' }}
    >
      {/* Card header */}
      <div
        className="flex items-center gap-3 px-4 py-3.5"
        style={{ background: bg, borderBottom: `1px solid ${borderColor}` }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: color + '20', border: `1px solid ${color}30` }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color }}>{label}</p>
          <p className="text-xs font-semibold" style={{ color: color + 'aa' }}>
            {expenses.length} entri · {formatRupiah(total)}
          </p>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/5 transition-colors"
        >
          {expanded
            ? <ChevronUp size={14} style={{ color }} />
            : <ChevronDown size={14} style={{ color }} />}
        </button>
      </div>

      {expanded && (
        <>
          {/* Recent entries */}
          <div className="bg-white">
            {recentList.length === 0 && !adding ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada data</p>
                {canInput && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Klik "Tambah" untuk input pengeluaran
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[--cream-border]">
                {recentList.map((expense) => {
                  const canDel = !isKadiv && (expense.created_by === currentUserId)
                  return (
                    <div key={expense.id} className="flex items-start gap-3 px-4 py-2.5 group hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                          {expense.description}
                        </p>
                        <div className="flex flex-wrap gap-x-3 mt-0.5">
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {formatDate(expense.expense_date)}
                          </span>
                          {expense.recipient_name && (
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {expense.recipient_name}
                            </span>
                          )}
                          {isKadiv && (expense as any).departments?.name && (
                            <span className="text-xs font-medium" style={{ color }}>
                              {(expense as any).departments.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-semibold" style={{ color }}>
                          {formatRupiah(expense.amount)}
                        </span>
                        {canDel && (
                          <button
                            onClick={() => handleDelete(expense.id, expense.description)}
                            disabled={loading === expense.id}
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-70"
                          >
                            {loading === expense.id
                              ? <Loader2 size={13} className="animate-spin" style={{ color: '#b3362a' }} />
                              : <Trash2 size={13} style={{ color: '#b3362a' }} />
                            }
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
                {hasMore && (
                  <p className="px-4 py-2 text-xs text-center" style={{ color: 'var(--text-muted)', background: 'var(--surface)' }}>
                    +{expenses.length - 5} entri lainnya — lihat di Laporan Pengeluaran
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Add form */}
          {canInput && adding && (
            <form
              ref={formRef}
              action={handleAdd}
              className="px-4 pb-4 pt-3 space-y-3"
              style={{ background: bg, borderTop: `1px solid ${borderColor}` }}
            >
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color }}>
                Input {label}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Tanggal *</label>
                  <input
                    name="expense_date"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full text-sm px-3 py-2 rounded-xl outline-none focus:ring-2"
                    style={{
                      border: `1px solid ${borderColor}`,
                      background: 'white',
                      // @ts-expect-error custom property
                      '--tw-ring-color': color,
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    {category === 'honor' ? 'Nama Penerima Honor' : 'Nama Vendor / Penerima'}
                  </label>
                  <input
                    name="recipient_name"
                    placeholder={category === 'honor' ? 'Nama narasumber / penerima' : 'Nama vendor / penyedia'}
                    className="w-full text-sm px-3 py-2 rounded-xl outline-none"
                    style={{ border: `1px solid ${borderColor}`, background: 'white' }}
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Keterangan *</label>
                  <input
                    name="description"
                    required
                    placeholder={
                      category === 'tiket' ? 'Contoh: Tiket pesawat Jakarta-Pangkalpinang PP' :
                      category === 'honor' ? 'Contoh: Honor narasumber seminar hukum, 3 Maret 2025' :
                      category === 'hotel' ? 'Contoh: Akomodasi hotel 2 malam, sidang Jakarta' :
                      category === 'sewa_kendaraan' ? 'Contoh: Sewa mobil dinas Jakarta 2 hari' :
                      'Contoh: Konsumsi rapat koordinasi, biaya fotokopi berkas'
                    }
                    className="w-full text-sm px-3 py-2 rounded-xl outline-none"
                    style={{ border: `1px solid ${borderColor}`, background: 'white' }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Jumlah (Rp) *</label>
                  <input
                    name="amount"
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="0"
                    required
                    className="w-full text-sm px-3 py-2 rounded-xl outline-none"
                    style={{ border: `1px solid ${borderColor}`, background: 'white' }}
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ background: '#fbeeec', color: '#b3362a' }}>
                  {error}
                </p>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={loading === 'add'}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: color }}
                >
                  {loading === 'add'
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Plus size={13} />}
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => { setAdding(false); setError(null) }}
                  className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-black/5 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Batal
                </button>
              </div>
            </form>
          )}

          {/* Add button */}
          {canInput && !adding && (
            <button
              onClick={() => setAdding(true)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:opacity-80"
              style={{
                color,
                background: bg,
                borderTop: `1px solid ${borderColor}`,
              }}
            >
              <Plus size={14} />
              <span className="font-semibold">Tambah {label}</span>
            </button>
          )}
        </>
      )}
    </div>
  )
}
