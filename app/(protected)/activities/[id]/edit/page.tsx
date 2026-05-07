import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ActivityForm } from '@/components/ActivityForm'
import { type Activity, type Department, type Profile, DEPT_BG_COLORS } from '@/lib/types'
import { ArrowLeft } from 'lucide-react'

export default async function EditActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: activity }, { data: profile }] = await Promise.all([
    supabase.from('activities').select('*, departments(*)').eq('id', id).single(),
    supabase.from('profiles').select('role, dept_id').eq('id', user.id).single(),
  ])

  if (!activity) notFound()

  const act    = activity as Activity & { departments: Department }
  const accent = DEPT_BG_COLORS[act.departments?.name] ?? 'var(--navy-900)'

  if (profile?.role === 'kadiv') redirect(`/activities/${id}`)
  if (profile?.dept_id !== act.dept_id) redirect(`/activities/${id}`)

  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('dept_id', act.dept_id)
    .order('full_name')

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/activities/${id}`}
          className="flex items-center gap-1.5 text-sm transition-colors hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={15} />
          <span>Kembali</span>
        </Link>
        <div className="flex-1" />
        <div className="text-right">
          <h1 className="font-serif" style={{ fontSize: '20px', color: 'var(--navy-900)' }}>
            Edit Kegiatan
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {act.departments?.name}
          </p>
        </div>
      </div>

      <div
        className="bg-white rounded-2xl p-5"
        style={{ border: '1px solid var(--cream-border)', boxShadow: '0 2px 8px rgba(11,25,41,0.06)' }}
      >
        <div className="h-1 rounded-full mb-5" style={{ background: accent }} />
        <ActivityForm
          department={act.departments}
          userId={user.id}
          activity={act}
          deptMembers={members as Profile[] ?? []}
        />
      </div>
    </div>
  )
}
