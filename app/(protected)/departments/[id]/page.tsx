import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ActivityCard } from '@/components/ActivityCard'
import { type Activity, type Department, DEPT_BG_COLORS } from '@/lib/types'
import { Plus } from 'lucide-react'

export default async function DepartmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: dept }, { data: profile }, { data: activities }] = await Promise.all([
    supabase.from('departments').select('*').eq('id', id).single(),
    supabase.from('profiles').select('role, dept_id').eq('id', user.id).single(),
    supabase
      .from('activities')
      .select('*, departments(name)')
      .eq('dept_id', id)
      .order('end_date', { ascending: true }),
  ])

  if (!dept) notFound()

  const department = dept as Department
  const acts       = activities as Activity[] ?? []
  const canAdd     = profile?.role !== 'kadiv' && profile?.dept_id === id
  const accent     = DEPT_BG_COLORS[department.name] ?? 'var(--navy-600)'

  const grouped = {
    berjalan:    acts.filter((a) => a.status === 'berjalan'),
    belum_mulai: acts.filter((a) => a.status === 'belum_mulai'),
    ditunda:     acts.filter((a) => a.status === 'ditunda'),
    selesai:     acts.filter((a) => a.status === 'selesai'),
  }

  const SECTIONS = [
    { key: 'berjalan',    dot: '#d97706', label: 'Sedang Berjalan' },
    { key: 'belum_mulai', dot: '#3b82f6', label: 'Belum Mulai'     },
    { key: 'ditunda',     dot: '#dc2626', label: 'Ditunda'          },
    { key: 'selesai',     dot: '#059669', label: 'Selesai'          },
  ] as const

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Departemen
          </p>
          <h1 className="font-serif leading-tight" style={{ fontSize: '26px', color: 'var(--navy-900)' }}>
            {department.name}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {acts.length} kegiatan total
          </p>
        </div>
        {canAdd && (
          <Link
            href={`/activities/new?dept=${id}`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shrink-0 transition-opacity hover:opacity-90"
            style={{ background: 'var(--navy-900)', boxShadow: '0 2px 8px rgba(11,25,41,0.2)' }}
          >
            <Plus size={15} />
            Tambah
          </Link>
        )}
      </div>

      {/* Accent bar */}
      <div className="h-1 rounded-full" style={{ background: `${accent}30` }}>
        <div
          className="h-1 rounded-full transition-all"
          style={{
            width: acts.length > 0 ? `${Math.round((grouped.selesai.length / acts.length) * 100)}%` : '0%',
            background: accent,
          }}
        />
      </div>

      {acts.length === 0 ? (
        <div
          className="text-center py-16 rounded-2xl"
          style={{ background: 'white', border: '1px solid var(--cream-border)' }}
        >
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>Belum ada kegiatan.</p>
          {canAdd && (
            <Link
              href={`/activities/new?dept=${id}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--navy-900)' }}
            >
              <Plus size={14} />
              Tambah kegiatan pertama
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {SECTIONS.map(({ key, dot, label }) => {
            const items = grouped[key]
            if (items.length === 0) return null
            return (
              <section key={key}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                    {label}
                  </p>
                  <span
                    className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: `${dot}20`, color: dot }}
                  >
                    {items.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((a) => <ActivityCard key={a.id} activity={a} />)}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
