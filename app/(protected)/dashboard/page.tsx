import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DepartmentCard } from '@/components/DepartmentCard'
import { ActivityCard } from '@/components/ActivityCard'
import { type Activity, type Department } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'kadiv') redirect('/login')

  const [{ data: departments }, { data: activities }] = await Promise.all([
    supabase.from('departments').select('*').order('sort_order'),
    supabase
      .from('activities')
      .select('*, departments(name)')
      .order('end_date', { ascending: true }),
  ])

  const depts = departments as Department[] ?? []
  const acts  = activities  as Activity[]  ?? []

  const actsByDept = (deptId: string) => acts.filter((a) => a.dept_id === deptId)
  const recentActs = acts.filter((a) => a.status !== 'selesai')

  const totalActs   = acts.length
  const activeActs  = acts.filter((a) => a.status === 'berjalan').length
  const finishedActs = acts.filter((a) => a.status === 'selesai').length

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <h1 className="font-serif leading-tight" style={{ fontSize: '28px', color: 'var(--navy-900)' }}>
          Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Ringkasan kegiatan seluruh departemen
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { value: totalActs,   label: 'Total Kegiatan', color: 'var(--navy-900)' },
          { value: activeActs,  label: 'Sedang Berjalan', color: '#d97706' },
          { value: finishedActs, label: 'Selesai',        color: '#059669' },
        ].map(({ value, label, color }) => (
          <div
            key={label}
            className="bg-white rounded-2xl p-4 text-center"
            style={{ border: '1px solid var(--cream-border)', boxShadow: '0 1px 4px rgba(11,25,41,0.05)' }}
          >
            <p className="text-2xl font-bold leading-none" style={{ color }}>{value}</p>
            <p className="text-xs mt-1.5 leading-tight" style={{ color: 'var(--text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Department cards */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1" style={{ background: 'var(--cream-border)' }} />
          <p className="text-xs font-bold uppercase tracking-widest shrink-0" style={{ color: 'var(--text-muted)' }}>
            Departemen
          </p>
          <div className="h-px flex-1" style={{ background: 'var(--cream-border)' }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {depts.filter((d) => d.sort_order < 5).map((dept) => (
            <DepartmentCard key={dept.id} department={dept} activities={actsByDept(dept.id)} />
          ))}
        </div>
        {depts.filter((d) => d.sort_order >= 5).map((dept) => (
          <div key={dept.id} className="flex justify-center mt-3">
            <div className="w-full sm:w-1/2 sm:pr-1.5">
              <DepartmentCard department={dept} activities={actsByDept(dept.id)} />
            </div>
          </div>
        ))}
      </div>

      {/* Active activities feed */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1" style={{ background: 'var(--cream-border)' }} />
          <p className="text-xs font-bold uppercase tracking-widest shrink-0" style={{ color: 'var(--text-muted)' }}>
            Kegiatan Aktif & Mendatang
          </p>
          <div className="h-px flex-1" style={{ background: 'var(--cream-border)' }} />
        </div>
        {recentActs.length === 0 ? (
          <div
            className="text-center py-12 rounded-2xl"
            style={{ background: 'white', border: '1px solid var(--cream-border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Tidak ada kegiatan aktif saat ini.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentActs.map((act) => (
              <ActivityCard key={act.id} activity={act} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
