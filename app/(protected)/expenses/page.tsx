import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ExpenseForm } from '@/components/ExpenseForm'
import { ExpenseTable } from '@/components/ExpenseTable'
import { BudgetCard } from './BudgetCard'
import { CapexCard } from './CapexCard'
import { SectionDivider } from '@/components/SectionDivider'
import { Collapsible } from '@/components/Collapsible'
import { type Expense, type Profile } from '@/lib/types'
import { Receipt } from 'lucide-react'

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Paralel — tiap roundtrip DB ±100ms; berurutan bikin halaman lemot
  const [{ data: profile }, { data: expenses }, { data: setting }] = await Promise.all([
    supabase.from('profiles').select('*, departments(name)').eq('id', user.id).single(),
    supabase
      .from('expenses')
      .select('*, profiles(full_name), departments(name)')
      .order('expense_date', { ascending: false }),
    supabase.from('app_settings').select('value').eq('key', 'budget_pagu').maybeSingle(),
  ])

  if (!profile) redirect('/login')
  const currentUser = profile as Profile

  const expenseList = (expenses as Expense[]) ?? []
  const isKadiv     = currentUser.role === 'kadiv'
  const canInput    = currentUser.role !== 'kadiv'
  // Budget viewer (mis. staf administrasi tertentu) melihat panel anggaran
  // penuh seperti kadiv; RLS 010 juga membuka select semua expenses untuknya
  const canViewBudget = isKadiv || currentUser.is_budget_viewer === true

  // Pagu anggaran OPEX — staf boleh mengisi, tapi panel sisa hanya kadiv
  // (total pengeluaran yang terlihat non-kadiv cuma slice dept-nya)
  const pagu = setting?.value ? Number(setting.value) : null

  // Pisah OPEX vs CAPEX — masing-masing pagu & pengeluaran sendiri
  const opexList  = expenseList.filter((e) => e.budget_type !== 'capex')
  const capexList = expenseList.filter((e) => e.budget_type === 'capex')
  const opexTotal  = opexList.reduce((sum, e) => sum + e.amount, 0)
  const capexTotal = capexList.reduce((sum, e) => sum + e.amount, 0)

  // Month filter: group by month for summary
  const months = [...new Set(expenseList.map((e) => e.expense_date.slice(0, 7)))].sort().reverse()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: '#e9f1fb', border: '1px solid #c9dcf3' }}
            >
              <Receipt size={16} style={{ color: '#2458a6' }} />
            </div>
            <h1 className="font-serif" style={{ fontSize: '22px', color: 'var(--navy-900)' }}>
              Laporan Pengeluaran
            </h1>
          </div>
          <p className="text-sm ml-11" style={{ color: 'var(--text-muted)' }}>
            {isKadiv
              ? 'Semua laporan pengeluaran Divisi Hukum'
              : `Laporan pengeluaran — ${currentUser.departments?.name ?? 'Departemen Anda'}`
            }
          </p>
        </div>
      </div>

      {/* Input form (only non-kadiv) — pilih Jenis Anggaran OPEX/CAPEX di form */}
      {canInput && <ExpenseForm />}

      {/* ══ SEKSI ANGGARAN OPEX ══ */}
      <SectionDivider label="Anggaran OPEX — Operasional" />
      {canViewBudget && <BudgetCard pagu={pagu} totalSpent={opexTotal} />}
      <Collapsible title={`Daftar Pengeluaran OPEX (${opexList.length} entri)`}>
        <ExpenseTable
          expenses={opexList}
          isKadiv={isKadiv}
          currentUserId={user.id}
          emptyText="Belum ada pengeluaran OPEX."
        />
      </Collapsible>

      {/* ══ SEKSI ANGGARAN CAPEX ══ */}
      <SectionDivider label="Anggaran CAPEX — Perpanjangan & Pembaharuan HGB" />
      {canViewBudget && <CapexCard totalSpent={capexTotal} />}
      <Collapsible title={`Daftar Pengeluaran CAPEX — Pengurusan HGB (${capexList.length} entri)`}>
        <ExpenseTable
          expenses={capexList}
          isKadiv={isKadiv}
          currentUserId={user.id}
          hideSummary
          emptyText="Belum ada pengeluaran CAPEX."
        />
      </Collapsible>
    </div>
  )
}
