import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { type Expense, type ExpenseCategory, EXPENSE_CATEGORY_LABELS, EXPENSE_CATEGORY_COLORS } from '@/lib/types'
import { AdminCategoryCard } from './AdminCategoryCard'
import { BudgetCard } from '../expenses/BudgetCard'
import { CapexCard } from '../expenses/CapexCard'
import { SectionDivider } from '@/components/SectionDivider'
import { CapexForm } from './CapexForm'
import { Collapsible } from '@/components/Collapsible'
import { formatDate } from '@/lib/utils'
import { Plane, Users, Hotel, Car, MoreHorizontal, Receipt, ArrowRight } from 'lucide-react'

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
    bg:          '#e9f1fb',
    borderColor: '#c9dcf3',
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
    color:       '#1e7a56',
    bg:          '#e9f5ef',
    borderColor: '#bfe3d2',
  },
  {
    category:    'sewa_kendaraan',
    icon:        <Car size={18} />,
    color:       '#b3362a',
    bg:          '#fbeeec',
    borderColor: '#efcfca',
  },
  {
    category:    'lainnya',
    icon:        <MoreHorizontal size={18} />,
    color:       '#a05c0a',
    bg:          '#fdf3e3',
    borderColor: '#eed9b4',
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

  // Paralel — tiap roundtrip DB ±100ms; berurutan bikin halaman lemot
  const [{ data: profile }, { data: expenses }, { data: setting }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('expenses')
      .select('*, profiles(full_name), departments(name)')
      .order('expense_date', { ascending: false }),
    supabase.from('app_settings').select('value').eq('key', 'budget_pagu').maybeSingle(),
  ])
  if (!profile) redirect('/login')

  const isKadiv   = profile.role === 'kadiv'
  const canInput  = !isKadiv
  // Budget viewer (mis. staf administrasi tertentu) = panel anggaran penuh
  const canViewBudget = isKadiv || profile.is_budget_viewer === true

  const expenseList = (expenses as Expense[]) ?? []

  // Pisah OPEX vs CAPEX — masing-masing pagu & pengeluaran sendiri
  const opexList  = expenseList.filter((e) => e.budget_type !== 'capex')
  const capexList = expenseList.filter((e) => e.budget_type === 'capex')
  const capexTotal = capexList.reduce((s, e) => s + e.amount, 0)

  // Group by category (OPEX)
  const byCategory = (cat: ExpenseCategory) =>
    opexList.filter((e) => e.category === cat)

  // Grand total per category (OPEX)
  const totals: Record<ExpenseCategory, number> = { tiket: 0, honor: 0, hotel: 0, sewa_kendaraan: 0, lainnya: 0 }
  for (const e of opexList) totals[e.category as ExpenseCategory] += e.amount
  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0)

  // Pagu anggaran (sumber sama dgn halaman Pengeluaran; staf boleh isi, sisa hanya kadiv)
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

      {/* ══ SEKSI ANGGARAN OPEX ══ */}
      <SectionDivider label="Anggaran OPEX — Operasional" />

      {/* Panel anggaran terpadu (pagu terisi): Pagu − Total Pengeluaran = Sisa + rincian kategori */}
      {canViewBudget && pagu !== null && (
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

      {/* Pagu belum diatur: strip pengisian pagu */}
      {canViewBudget && pagu === null && <BudgetCard pagu={null} totalSpent={grandTotal} />}


      {/* Banner total lama — untuk yang tanpa akses panel, atau pagu belum diisi */}
      {(!canViewBudget || pagu === null) && (
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

      {/* ══ SEKSI ANGGARAN CAPEX ══ */}
      <SectionDivider label="Anggaran CAPEX — Perpanjangan & Pembaharuan HGB" />

      {canViewBudget && <CapexCard totalSpent={capexTotal} />}

      {/* Input pengeluaran CAPEX (staf/dept head) */}
      {canInput && <CapexForm />}

      {/* Daftar pengeluaran CAPEX (dropdown) */}
      <Collapsible title={`Daftar Pengeluaran CAPEX — Pengurusan HGB (${capexList.length} entri)`}>
        {capexList.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
            Belum ada pengeluaran CAPEX. Input lewat kartu "Input Pengeluaran CAPEX" di atas.
          </p>
        ) : (
          <div className="divide-y divide-[--cream-border]">
            {capexList.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 px-1 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{e.description}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(e.expense_date)}
                    {e.recipient_name && ` · ${e.recipient_name}`}
                    {' · '}Pengurusan HGB
                  </p>
                </div>
                <p className="text-sm font-semibold shrink-0" style={{ color: 'var(--navy-900)' }}>
                  {formatRupiah(e.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Collapsible>

      {!isKadiv && (
        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
          Klik <strong>Tambah</strong> di dalam setiap kategori untuk menginput pengeluaran OPEX.
          Pengeluaran CAPEX diinput lewat halaman Laporan Pengeluaran (pilih Jenis Anggaran CAPEX).
          Data tersimpan otomatis ke departemen Anda.
        </p>
      )}
    </div>
  )
}
