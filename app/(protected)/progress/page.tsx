import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { type Profile, type ProgressItem } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { ProgressForm } from './ProgressForm'
import { ProgressToggle, ProgressDelete } from './ProgressRowActions'
import { EditTargetButton } from './EditTargetButton'
import { TrendingUp, AlertTriangle, CheckCircle2, Clock, MessageCircle } from 'lucide-react'

interface ItemWithPic extends ProgressItem {
  pic: Profile
}

function todayStr() {
  return new Date().toLocaleDateString('sv-SE')
}

// Status ketepatan waktu, dihitung dari target vs tanggal selesai
function timelineStatus(item: ItemWithPic, today: string) {
  if (item.status === 'done') {
    const doneDate = item.completed_at
      ? new Date(item.completed_at).toLocaleDateString('sv-SE')
      : today
    return doneDate <= item.target_date
      ? { label: 'Tepat Waktu', color: '#059669', bg: '#f0fdf4' }
      : { label: 'Selesai Terlambat', color: '#d97706', bg: '#fffbeb' }
  }
  return item.target_date < today
    ? { label: 'Melewati Target', color: '#dc2626', bg: '#fef2f2' }
    : { label: 'Berjalan', color: '#2563eb', bg: '#eff6ff' }
}

function StatCard({ value, label, color, bg, icon }: { value: number; label: string; color: string; bg: string; icon: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-4 flex items-start justify-between"
      style={{ background: bg, border: '1px solid var(--cream-border)', boxShadow: '0 1px 4px rgba(11,25,41,0.05)' }}
    >
      <div>
        <p className="text-2xl font-bold leading-none" style={{ color }}>{value}</p>
        <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      </div>
      <span style={{ color }}>{icon}</span>
    </div>
  )
}

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const isKadiv = profile.role === 'kadiv'

  const { data: items } = await supabase
    .from('progress_items')
    .select('*, pic:profiles!progress_items_pic_id_fkey(id, full_name, role, dept_id, phone, departments(id, name))')
    .order('status', { ascending: true })
    .order('target_date', { ascending: true })

  const allItems = (items ?? []) as unknown as ItemWithPic[]
  const today = todayStr()

  const running  = allItems.filter(i => i.status === 'pending' && i.target_date >= today)
  const overdue  = allItems.filter(i => i.status === 'pending' && i.target_date < today)
  const onTime   = allItems.filter(i => timelineStatus(i, today).label === 'Tepat Waktu')
  const lateDone = allItems.filter(i => timelineStatus(i, today).label === 'Selesai Terlambat')

  // Daftar PIC untuk form (semua user selain kadiv)
  let people: Profile[] = []
  if (isKadiv) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, dept_id, created_at, departments(id, name)')
      .neq('role', 'kadiv')
      .eq('is_active', true)
      .order('full_name')
    people = (data ?? []) as unknown as Profile[]
  }

  const gridCols = isKadiv ? '24px 1fr 180px 110px 110px 130px 92px' : '24px 1fr 180px 110px 110px 130px'

  // Pesan siap-kirim WhatsApp untuk PIC. Kalau nomor WA PIC terisi
  // (Kelola Akun), langsung tertuju ke orangnya; kalau kosong, Boss pilih kontak.
  function waLink(item: ItemWithPic) {
    const msg =
      `Halo ${item.pic?.full_name ?? ''},\n\n` +
      `Anda saya tugaskan pekerjaan:\n` +
      `📋 ${item.title}\n` +
      `🎯 Target selesai: ${formatDate(item.target_date)}\n\n` +
      `Mohon ditindaklanjuti dan tandai selesai di aplikasi Monitor Kegiatan:\n` +
      `https://monitor-giat.vercel.app/progress`
    const digits = (item.pic?.phone ?? '').replace(/\D/g, '')
    const intl = digits.startsWith('0') ? '62' + digits.slice(1) : digits
    return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="font-serif leading-tight" style={{ fontSize: '26px', color: 'var(--navy-900)' }}>
          Monitor Progress
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {isKadiv
            ? 'Input item pekerjaan, tugaskan PIC, dan pantau ketepatan waktu penyelesaian'
            : 'Pekerjaan yang ditugaskan Kepala Divisi — tandai selesai jika sudah rampung'}
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard value={running.length}  label="Berjalan"          color="#2563eb" bg="#eff6ff" icon={<Clock size={16} />} />
        <StatCard value={overdue.length}  label="Melewati Target"   color="#dc2626" bg="#fef2f2" icon={<AlertTriangle size={16} />} />
        <StatCard value={onTime.length}   label="Selesai Tepat Waktu" color="#059669" bg="#f0fdf4" icon={<CheckCircle2 size={16} />} />
        <StatCard value={lateDone.length} label="Selesai Terlambat" color="#d97706" bg="#fffbeb" icon={<TrendingUp size={16} />} />
      </div>

      {/* Form input (Kadiv only) */}
      {isKadiv && <ProgressForm people={people} />}

      {/* List */}
      {allItems.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl" style={{ border: '1px solid var(--cream-border)' }}>
          <TrendingUp size={36} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Belum ada item pekerjaan</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {isKadiv ? 'Tambahkan item pekerjaan lewat form di atas' : 'Belum ada pekerjaan yang ditugaskan'}
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden bg-white"
          style={{ border: '1px solid var(--cream-border)', boxShadow: '0 2px 8px rgba(11,25,41,0.06)' }}
        >
          {/* Column headers (desktop) */}
          <div
            className="hidden sm:grid text-xs font-semibold uppercase tracking-wider px-4 py-2 gap-3"
            style={{
              gridTemplateColumns: gridCols,
              color: 'var(--text-muted)',
              background: 'var(--surface)',
              borderBottom: '1px solid var(--cream-border)',
            }}
          >
            <span />
            <span>Pekerjaan</span>
            <span>PIC</span>
            <span>Target</span>
            <span>Selesai</span>
            <span>Status</span>
            {isKadiv && <span />}
          </div>

          <div className="divide-y divide-[--cream-border]">
            {allItems.map((item) => {
              const st = timelineStatus(item, today)
              const isDone = item.status === 'done'
              const canToggle = isKadiv || item.pic_id === user.id

              return (
                <div
                  key={item.id}
                  className="px-4 py-3 flex flex-col gap-2 sm:grid sm:items-center sm:gap-3"
                  style={{ gridTemplateColumns: gridCols, background: isDone ? '#f9fafb' : 'white' }}
                >
                  <div className="flex items-center gap-2.5 sm:contents">
                    <ProgressToggle itemId={item.id} status={item.status} canToggle={canToggle} />
                    <p
                      className="text-sm min-w-0 flex-1 sm:truncate"
                      style={{
                        color: isDone ? '#9ca3af' : st.label === 'Melewati Target' ? '#991b1b' : 'var(--text-primary)',
                        textDecoration: isDone ? 'line-through' : 'none',
                      }}
                    >
                      {item.title}
                    </p>
                    <p className="hidden sm:block text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {item.pic?.full_name ?? '—'}
                    </p>
                    <p className="hidden sm:block text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(item.target_date)}
                    </p>
                    <p className="hidden sm:block text-xs" style={{ color: 'var(--text-muted)' }}>
                      {item.completed_at ? formatDate(item.completed_at) : '—'}
                    </p>
                    <div className="hidden sm:block">
                      <span
                        className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ color: st.color, background: st.bg, border: `1px solid ${st.color}25` }}
                      >
                        {st.label}
                      </span>
                    </div>
                    {isKadiv && (
                      <div className="flex items-center gap-1 shrink-0">
                        <EditTargetButton itemId={item.id} title={item.title} targetDate={item.target_date} />
                        <a
                          href={waLink(item)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg transition-colors hover:bg-green-50"
                          style={{ color: '#25D366' }}
                          title="Kirim penugasan via WhatsApp"
                        >
                          <MessageCircle size={14} />
                        </a>
                        <ProgressDelete itemId={item.id} />
                      </div>
                    )}
                  </div>

                  {/* Mobile meta */}
                  <div className="flex items-center gap-2 flex-wrap sm:hidden pl-[30px]">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ color: st.color, background: st.bg }}
                    >
                      {st.label}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {item.pic?.full_name ?? '—'} · Target {formatDate(item.target_date)}
                      {item.completed_at && ` · Selesai ${formatDate(item.completed_at)}`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
