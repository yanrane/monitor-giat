import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Lightbulb } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ActivityForm } from '@/components/ActivityForm'
import { type Department, type Profile, DEPT_BG_COLORS } from '@/lib/types'

export default async function NewActivityPage({ searchParams }: { searchParams: Promise<{ dept?: string }> }) {
  const { dept } = await searchParams
  if (!dept) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: department }, { data: members }] = await Promise.all([
    supabase.from('profiles').select('role, dept_id').eq('id', user.id).single(),
    supabase.from('departments').select('*').eq('id', dept).single(),
    supabase.from('profiles').select('id, full_name, role').eq('dept_id', dept).order('full_name'),
  ])

  if (!department) notFound()
  if (profile?.role === 'kadiv') redirect('/dashboard')
  if (profile?.dept_id !== dept) redirect(`/departments/${profile?.dept_id}`)

  const deptData = department as Department
  const accent   = DEPT_BG_COLORS[deptData.name] ?? 'var(--navy-900)'

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
          {deptData.name}
        </p>
        <h1 className="font-serif leading-tight" style={{ fontSize: '26px', color: 'var(--navy-900)' }}>
          Tambah Kegiatan
        </h1>
      </div>

      {/* Panduan: kegiatan = pekerjaan utama, detail masuk tab Pekerjaan */}
      <div
        className="rounded-xl px-4 py-3.5 flex items-start gap-2.5"
        style={{ background: 'var(--warn-bg)', borderLeft: '3px solid var(--warn)' }}
      >
        <Lightbulb size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--warn)' }} />
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>
          <b>Kegiatan = pekerjaan utama</b> yang berjalan berminggu-minggu (perkara, proyek,
          program, kontrak besar). Rapat, pendampingan, atau langkah yang merupakan bagian dari
          pekerjaan yang sudah ada <b>jangan dibuat sebagai kegiatan baru</b> — buka{' '}
          <Link href={`/departments/${dept}`} className="underline font-semibold" style={{ color: 'var(--warn)' }}>
            kegiatan induknya
          </Link>{' '}
          lalu tambahkan di tab <b>Pekerjaan</b>.
        </p>
      </div>

      <div
        className="bg-white rounded-2xl p-5"
        style={{ border: '1px solid var(--cream-border)', boxShadow: '0 2px 8px rgba(11,25,41,0.06)' }}
      >
        <div className="h-1 rounded-full mb-5" style={{ background: accent }} />
        <ActivityForm department={deptData} userId={user.id} deptMembers={members as Profile[] ?? []} />
      </div>
    </div>
  )
}
