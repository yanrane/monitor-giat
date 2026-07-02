import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { type Expense, type ExpenseCategory, EXPENSE_CATEGORY_LABELS, EXPENSE_CATEGORY_COLORS } from '@/lib/types'
import { AdminCategoryCard } from './AdminCategoryCard'
import { BudgetCard } from '../expenses/BudgetCard'
import { CapexCard } from '../expenses/CapexCard'
import { Plane, Users, Hotel, MoreHorizontal, Receipt, ArrowRight } from 'lucide-react'

const CATEGORY_META: {
  category: ExpenseCategory
  icon: React.ReactNode
  color: string
  bg: string
  borderColor: string
}[] = [
  {
    category:    'tiket',
    icon:        <Plane size={18} />,
    color:       '#0891b2',
    bg:          '#f0f9ff',
    borderColor: '#bae6fd',
  },
  {
    category:    'honor',
    icon:        <Users size={18} />,
    color:       '#7c3aed',
    bg:          '#faf5ff',
    borderColor: '#ddd6fe',
  },
  {
    category:    'hotel',
    icon:        <Hotel size={18} />,
    color:       '#059669',
    bg:          '#f0fdf4',
    borderColor: '#a7f3d0',
  },
  {
    category:    'lainnya',
    icon:        <MoreHorizontal size={18} />,
    color:       '#d97706',
    bg:          '#fffbeb',
    borderColor: '#fde68a',
  },
]

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(amount)
}

export default async function AdministrasiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, dept_id, full_name').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const isKadiv   = profile.role === 'kadiv'
  const canInput  = !isKadiv

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*, profiles(full_name), departments(name)')
    .order('expense_date', { ascending: false })

  const expenseList = (expenses as Expense[]) ?? []

  // Group by category
  const byCategory = (cat: ExpenseCategory) =>
    expenseList.filter((e) => e.category === cat)

  // Grand total per category
  const totals: Record<ExpenseCategory, number> = { tiket: 0, honor: 0, hotel: 0, lainnya: 0 }
  for (const e of expenseList) totals[e.category as ExpenseCategory] += e.amount
  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0)

  // Pagu anggaran (sumber sama dgn halaman Pengeluaran; staf boleh isi, sisa hanya kadiv)
  const { data: setting } = await supabase
    .from('app_settings').select('value').eq('key', 'budget_pagu').maybeSingle()
  const pagu = setting?.value ? Number(setting.value) : null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--navy-900)' }}
            >
              <Receipt size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-serif leading-tight" style={{ fontSize: '22px', color: 'var(--navy-900)' }}>
                Laporan Administrasi
              </h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {isKadiv
                  ? 'Rekapitulasi pengeluaran seluruh departemen — Divisi Hukum'
                  : 'Input dan pantau pengeluaran kegiatan departemen Anda'}
              </p>
            </div>
          </div>
        </div>
        <Link
          href="/expenses"
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl shrink-0 transition-opacity hover:opacity-70"
          style={{ background: 'var(--surface)', border: '1px solid var(--cream-border)', color: 'var(--text-muted)' }}
        >
          Lihat semua <ArrowRight size={12} />
        </Link>
      </div>

      {/* Panel anggaran terpadu (kadiv, pagu terisi): Pagu − Total Pengeluaran = Sisa + rincian kategori */}
      {isKadiv && pagu !== null && (
        <BudgetCard pagu={pagu} totalSpent={grandTotal}>
          <div className="flex flex-wrap gap-4">
            {CATEGORY_META.map(({ category, icon, color }) => (
              <div key={category}>
                <div className="flex items-center gap-1.5">
                  <span style={{ color, opacity: 0.9 }}>{icon}</span>
                  <span className="text-xs font-medium opacity-70">
                    {EXPENSE_CATEGORY_LABELS[category]}
                  </span>
                </div>
                <p className="text-sm font-bold mt-0.5">{formatRupiah(totals[category])}</p>
              </div>
            ))}
          </div>
        </BudgetCard>
      )}

      {/* Kadiv tapi pagu belum diatur: strip pengisian pagu */}
      {isKadiv && pagu === null && <BudgetCard pagu={null} totalSpent={grandTotal} />}

      {/* Staf/dept head: strip pagu (bisa isi/edit), tanpa hitungan sisa */}
      {!isKadiv && <BudgetCard pagu={pagu} totalSpent={0} showRemaining={false} />}

      {/* Anggaran CAPEX — Perpanjangan & Pembaharuan HGB (kadiv) */}
      {isKadiv && <CapexCard />}

      {/* Banner total lama — untuk non-kadiv, atau kadiv yang belum set pagu */}
      {(!isKadiv || pagu === null) && (
        <div
          className="rounded-2xl p-4"
          style={{ background: 'var(--navy-900)', color: 'white' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium opacity-60 uppercase tracking-wider">Total Pengeluaran</p>
              <p className="text-2xl font-bold mt-0.5">{formatRupiah(grandTotal)}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {CATEGORY_META.map(({ category, icon, color }) => (
                <div key={category} className="text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span style={{ color, opacity: 0.9 }}>{icon}</span>
                    <span className="text-xs font-medium opacity-70">
                      {EXPENSE_CATEGORY_LABELS[category]}
                    </span>
                  </div>
                  <p className="text-sm font-bold mt-0.5">{formatRupiah(totals[category])}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4 category cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CATEGORY_META.map(({ category, icon, color, bg, borderColor }) => (
          <AdminCategoryCard
            key={category}
            category={category}
            label={EXPENSE_CATEGORY_LABELS[category]}
            icon={icon}
            color={color}
            bg={bg}
            borderColor={borderColor}
            expenses={byCategory(category)}
            canInput={canInput}
            isKadiv={isKadiv}
            currentUserId={user.id}
          />
        ))}
      </div>

      {!isKadiv && (
        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
          Klik <strong>Tambah</strong> di dalam setiap kategori untuk menginput pengeluaran.
          Data tersimpan otomatis ke departemen Anda.
        </p>
      )}
    </div>
  )
}
