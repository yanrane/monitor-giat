import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { type Profile, type ProgressItem } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { ProgressForm } from './ProgressForm'
import { ProgressToggle, ProgressDelete } from './ProgressRowActions'
import { EditTargetButton } from './EditTargetButton'
import { AutoRefresh } from './AutoRefresh'
import { Collapsible } from '@/components/Collapsible'
import { TrendingUp, AlertTriangle, CheckCircle2, Clock, MessageCircle } from 'lucide-react'

interface ItemWithPic extends ProgressItem {
  pic: Profile
}

// Multi-PIC disimpan satu baris DB per orang; di layar digabung 1 baris per pekerjaan
interface Group {
  title: string
  target_date: string
  members: ItemWithPic[]
}

function todayStr() {
  return new Date().toLocaleDateString('sv-SE')
}

function doneDateStr(item: ItemWithPic, today: string) {
  return item.completed_at ? new Date(item.completed_at).toLocaleDateString('sv-SE') : today
}

// Status gabungan per pekerjaan: ada yang belum selesai → Berjalan/Melewati Target;
// semua selesai → Tepat Waktu, kecuali ada yang telat → Selesai Terlambat
function groupStatus(group: Group, today: string) {
  const pending = group.members.some((m) => m.status !== 'done')
  if (pending) {
    return group.target_date < today
      ? { label: 'Melewati Target', color: 'var(--bad)', bg: 'var(--bad-bg)' }
      : { label: 'Berjalan', color: 'var(--run)', bg: 'var(--run-bg)' }
  }
  const late = group.members.some((m) => doneDateStr(m, today) > group.target_date)
  return late
    ? { label: 'Selesai Terlambat', color: 'var(--warn)', bg: 'var(--warn-bg)' }
    : { label: 'Tepat Waktu', color: 'var(--ok)', bg: 'var(--ok-bg)' }
}

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

function StatCard({ value, label, color, bg, icon, href, active }: {
  value: number; label: string; color: string; bg: string; icon: React.ReactNode
  href: string; active: boolean
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl p-4 flex items-start justify-between transition-shadow hover:shadow-md"
      style={{
        background: active ? bg : 'var(--surface)',
        border: `1px solid ${active ? color : 'var(--border)'}`,
        boxShadow: active ? `0 0 0 2px color-mix(in srgb, ${color} 30%, transparent)` : '0 1px 4px rgba(11,25,41,0.05)',
      }}
    >
      <div>
        <p className="text-2xl font-bold leading-none tabular-nums" style={{ color }}>{value}</p>
        <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      </div>
      <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg, color }}>
        {icon}
      </span>
    </Link>
  )
}

function GroupsTable({ groups, isKadiv, userId, today, framed = true }: {
  groups: Group[]; isKadiv: boolean; userId: string; today: string; framed?: boolean
}) {
  const gridCols = isKadiv ? '24px 1fr 200px 110px 110px 130px 68px' : '24px 1fr 200px 110px 110px 130px'

  return (
    <div
      className={framed ? 'rounded-2xl overflow-hidden bg-white' : ''}
      style={framed ? { border: '1px solid var(--cream-border)', boxShadow: '0 2px 8px rgba(11,25,41,0.06)' } : undefined}
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
        {groups.map((group) => {
          const st = groupStatus(group, today)
          const allDone = group.members.every((m) => m.status === 'done')
          const ids = group.members.map((m) => m.id)
          // Pekerjaan tim: satu centang untuk semua PIC; anggota tim mana pun bisa menandai
          const canToggle = isKadiv || group.members.some((m) => m.pic_id === userId)
          const latestDone = allDone
            ? group.members.reduce((max, m) => (m.completed_at && m.completed_at > max ? m.completed_at : max), '')
            : ''

          return (
            <div
              key={ids[0]}
              className="px-4 py-3 flex flex-col gap-2 sm:grid sm:items-center sm:gap-3"
              style={{ gridTemplateColumns: gridCols, background: allDone ? 'var(--surface-2)' : 'white' }}
            >
              <div className="flex items-center gap-2.5 sm:contents">
                <ProgressToggle
                  itemIds={ids}
                  status={allDone ? 'done' : 'pending'}
                  canToggle={canToggle}
                />
                <p
                  className="text-sm min-w-0 flex-1 break-words"
                  style={{
                    color: allDone ? 'var(--text-tertiary)' : st.label === 'Melewati Target' ? 'var(--bad)' : 'var(--text-primary)',
                    textDecoration: allDone ? 'line-through' : 'none',
                  }}
                >
                  {group.title}
                </p>

                {/* PIC — semua nama digabung satu kolom (kerja tim, selesai bersama) */}
                <div className="hidden sm:flex flex-col gap-1 min-w-0">
                  {group.members.map((m) => (
                    <div key={m.id} className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        {m.pic?.full_name ?? '—'}
                      </span>
                      {isKadiv && (
                        <a
                          href={waLink(m)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 transition-opacity hover:opacity-70"
                          style={{ color: '#25D366' }}
                          title={`Kirim penugasan via WhatsApp ke ${m.pic?.full_name ?? 'PIC'}`}
                        >
                          <MessageCircle size={12} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                <p className="hidden sm:block text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatDate(group.target_date)}
                </p>
                <p className="hidden sm:block text-xs" style={{ color: 'var(--text-muted)' }}>
                  {allDone && latestDone ? formatDate(latestDone) : '—'}
                </p>
                <div className="hidden sm:block">
                  <span
                    className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ color: st.color, background: st.bg, border: '1px solid color-mix(in srgb, currentColor 25%, transparent)' }}
                  >
                    {st.label}
                  </span>
                </div>
                {isKadiv && (
                  <div className="flex items-center gap-1 shrink-0">
                    <EditTargetButton itemIds={ids} title={group.title} targetDate={group.target_date} />
                    <ProgressDelete itemIds={ids} />
                  </div>
                )}
              </div>

              {/* Mobile meta */}
              <div className="flex flex-col gap-1.5 sm:hidden pl-[30px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ color: st.color, background: st.bg }}
                  >
                    {st.label}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Target {formatDate(group.target_date)}
                    {allDone && latestDone && ` · Selesai ${formatDate(latestDone)}`}
                  </span>
                </div>
                {group.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-1.5">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {m.pic?.full_name ?? '—'}
                    </span>
                    {isKadiv && (
                      <a
                        href={waLink(m)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#25D366' }}
                        title={`Kirim penugasan via WhatsApp ke ${m.pic?.full_name ?? 'PIC'}`}
                      >
                        <MessageCircle size={12} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {groups.length === 0 && (
          <p className="px-4 py-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
            Tidak ada item pada kategori ini.
          </p>
        )}
      </div>
    </div>
  )
}

const FILTERS = {
  berjalan:  { label: 'Berjalan' },
  melewati:  { label: 'Melewati Target' },
  tepat:     { label: 'Selesai Tepat Waktu' },
  terlambat: { label: 'Selesai Terlambat' },
} as const
type FilterKey = keyof typeof FILTERS

export default async function ProgressPage({ searchParams }: {
  searchParams: Promise<{ filter?: string }>
}) {
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

  // Gabung baris multi-PIC: satu pekerjaan = judul + target sama
  const groupMap = new Map<string, Group>()
  for (const item of allItems) {
    const key = `${item.title}|${item.target_date}`
    if (!groupMap.has(key)) groupMap.set(key, { title: item.title, target_date: item.target_date, members: [] })
    groupMap.get(key)!.members.push(item)
  }
  const allGroups = [...groupMap.values()]

  const running  = allGroups.filter((g) => groupStatus(g, today).label === 'Berjalan')
  const overdue  = allGroups.filter((g) => groupStatus(g, today).label === 'Melewati Target')
  const onTime   = allGroups.filter((g) => groupStatus(g, today).label === 'Tepat Waktu')
  const lateDone = allGroups.filter((g) => groupStatus(g, today).label === 'Selesai Terlambat')

  const byFilter: Record<FilterKey, Group[]> = {
    berjalan: running, melewati: overdue, tepat: onTime, terlambat: lateDone,
  }

  const rawFilter = (await searchParams).filter
  const filter: FilterKey | null = rawFilter && rawFilter in FILTERS ? rawFilter as FilterKey : null

  const activeGroups = [...overdue, ...running]
  const doneGroups = [...onTime, ...lateDone]

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

  return (
    <div className="space-y-6 max-w-5xl">
      <AutoRefresh />
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

      {/* Summary stats — klik untuk filter, klik lagi untuk semua */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard value={running.length}  label="Berjalan"          color="var(--run)" bg="var(--run-bg)" icon={<Clock size={15} />}
          href={filter === 'berjalan' ? '/progress' : '/progress?filter=berjalan'} active={filter === 'berjalan'} />
        <StatCard value={overdue.length}  label="Melewati Target"   color="var(--bad)" bg="var(--bad-bg)" icon={<AlertTriangle size={15} />}
          href={filter === 'melewati' ? '/progress' : '/progress?filter=melewati'} active={filter === 'melewati'} />
        <StatCard value={onTime.length}   label="Selesai Tepat Waktu" color="var(--ok)" bg="var(--ok-bg)" icon={<CheckCircle2 size={15} />}
          href={filter === 'tepat' ? '/progress' : '/progress?filter=tepat'} active={filter === 'tepat'} />
        <StatCard value={lateDone.length} label="Selesai Terlambat" color="var(--warn)" bg="var(--warn-bg)" icon={<TrendingUp size={15} />}
          href={filter === 'terlambat' ? '/progress' : '/progress?filter=terlambat'} active={filter === 'terlambat'} />
      </div>

      {/* Form input (Kadiv only) */}
      {isKadiv && <ProgressForm people={people} />}

      {allGroups.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl" style={{ border: '1px solid var(--cream-border)' }}>
          <TrendingUp size={36} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Belum ada item pekerjaan</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {isKadiv ? 'Tambahkan item pekerjaan lewat form di atas' : 'Belum ada pekerjaan yang ditugaskan'}
          </p>
        </div>
      ) : filter ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Filter: {FILTERS[filter].label} ({byFilter[filter].length})
            </p>
            <Link href="/progress" className="text-xs font-medium underline" style={{ color: 'var(--text-muted)' }}>
              Tampilkan semua
            </Link>
          </div>
          <GroupsTable groups={byFilter[filter]} isKadiv={isKadiv} userId={user.id} today={today} />
        </div>
      ) : (
        <>
          <GroupsTable groups={activeGroups} isKadiv={isKadiv} userId={user.id} today={today} />
          {doneGroups.length > 0 && (
            <Collapsible title={`Selesai (${doneGroups.length})`}>
              <GroupsTable groups={doneGroups} isKadiv={isKadiv} userId={user.id} today={today} framed={false} />
            </Collapsible>
          )}
        </>
      )}
    </div>
  )
}
