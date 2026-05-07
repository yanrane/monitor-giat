import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { type Profile, type Department } from '@/lib/types'
import { InviteUserForm } from './InviteUserForm'
import { EditProfileRow } from './EditProfileRow'
import { ResetPasswordButton } from './ResetPasswordButton'
import { Shield } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  kadiv:     'Kadiv',
  dept_head: 'Dept Head',
  staff:     'Staf',
}

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  kadiv:     { bg: 'var(--gold-100)',  color: 'var(--gold-600)'  },
  dept_head: { bg: 'var(--navy-100)',  color: 'var(--navy-600)'  },
  staff:     { bg: 'var(--cream-dark)', color: 'var(--text-secondary)' },
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (currentProfile?.role !== 'kadiv') redirect('/dashboard')

  const [{ data: profiles }, { data: departments }] = await Promise.all([
    supabase.from('profiles').select('*, departments(name)').order('role').order('full_name'),
    supabase.from('departments').select('*').order('name'),
  ])

  const users = profiles as (Profile & { departments: Department | null })[] ?? []
  const depts = departments as Department[] ?? []

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--navy-900)' }}
        >
          <Shield size={18} className="text-white" />
        </div>
        <div>
          <h1 className="font-serif leading-tight" style={{ fontSize: '26px', color: 'var(--navy-900)' }}>
            Kelola Pengguna
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Undang pengguna baru dan atur hak akses
          </p>
        </div>
      </div>

      {/* Invite form section */}
      <div
        className="bg-white rounded-2xl p-5"
        style={{ border: '1px solid var(--cream-border)', boxShadow: '0 2px 8px rgba(11,25,41,0.06)' }}
      >
        <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>
          Undang Pengguna Baru
        </p>
        <InviteUserForm departments={depts} />
      </div>

      {/* Users list */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1" style={{ background: 'var(--cream-border)' }} />
          <p className="text-xs font-bold uppercase tracking-widest shrink-0" style={{ color: 'var(--text-muted)' }}>
            Daftar Pengguna ({users.length})
          </p>
          <div className="h-px flex-1" style={{ background: 'var(--cream-border)' }} />
        </div>

        <div className="space-y-2">
          {users.map((u) => {
            const roleColor = ROLE_COLORS[u.role] ?? ROLE_COLORS.staff
            const initials  = u.full_name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
            return (
              <div
                key={u.id}
                className="flex items-center gap-3 bg-white rounded-xl px-4 py-3"
                style={{ border: '1px solid var(--cream-border)', boxShadow: '0 1px 4px rgba(11,25,41,0.04)' }}
              >
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
                  style={{ background: 'var(--navy-900)', color: 'white' }}
                >
                  {initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                    {u.full_name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {u.departments?.name ?? '—'}
                  </p>
                </div>

                {/* Role badge */}
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                  style={{ background: roleColor.bg, color: roleColor.color }}
                >
                  {ROLE_LABELS[u.role] ?? u.role}
                </span>

                {u.role !== 'kadiv' && <ResetPasswordButton userId={u.id} name={u.full_name} />}
                <EditProfileRow profile={u} departments={depts} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
