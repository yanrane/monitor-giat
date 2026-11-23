import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate, formatDateTime, wibDateStr } from '@/lib/utils'
import { type ProgressProposal } from '@/lib/types'
import { ProposalDecisionForm } from './ProposalDecisionForm'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const STATUS_STYLE = {
  menunggu:  { label: 'Menunggu keputusan', color: 'var(--navy-600)', bg: 'var(--navy-50)' },
  disetujui: { label: 'Disetujui',          color: 'var(--ok)',       bg: 'var(--ok-bg)' },
  ditolak:   { label: 'Ditolak',            color: 'var(--bad)',      bg: 'var(--bad-bg)' },
} as const

// Halaman persetujuan usulan target dari disposisi TEO — khusus Kadiv, dibuka dari link WA KEVIN
export default async function ProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(`/usulan/${id}`)}`)

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'kadiv') notFound()

  const [{ data: proposal }, { data: peopleRaw }] = await Promise.all([
    supabase.from('progress_proposals').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('profiles')
      .select('id, full_name, departments(name)')
      .eq('is_active', true)
      .neq('role', 'kadiv')
      .order('full_name'),
  ])
  if (!proposal) notFound()
  const p = proposal as ProgressProposal

  const people = ((peopleRaw ?? []) as unknown as { id: string; full_name: string; departments: { name: string } | null }[])
    .map((x) => ({ id: x.id, name: x.full_name, dept: x.departments?.name ?? null }))
  const nameOf = new Map(people.map((x) => [x.id, x.name]))

  // bot_tokens tertutup untuk klien (RLS tanpa policy) → label pengusul via service_role bila tersedia
  let proposer = '—'
  if (p.proposed_by_token && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { data: tok } = await createAdminClient().from('bot_tokens').select('label').eq('id', p.proposed_by_token).maybeSingle()
    proposer = tok?.label ?? '—'
  }

  const st = STATUS_STYLE[p.status]
  const card = { background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(11,25,41,0.05)' }
  const row = (label: string, value: React.ReactNode) => (
    <div className="grid grid-cols-[110px_1fr] gap-3 py-2 text-sm" style={{ borderTop: '1px solid var(--separator)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  )

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <p className="text-xs font-bold tracking-wide" style={{ color: 'var(--text-muted)' }}>USULAN TARGET DARI DISPOSISI TEO</p>
        <h1 className="font-serif leading-tight mt-1" style={{ fontSize: '24px', color: 'var(--navy-900)' }}>{p.judul}</h1>
        <span className="inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: st.color, background: st.bg }}>
          {st.label}
        </span>
      </div>

      <section className="rounded-2xl px-4 pb-2 pt-1" style={card}>
        {row('No. TEO', p.teo_ref)}
        {p.teo_tanggal && row('Tgl. disposisi', formatDate(p.teo_tanggal))}
        {row('Perihal', p.perihal)}
        {p.instruksi && row('Instruksi', <span className="whitespace-pre-line">{p.instruksi}</span>)}
        {row('Usulan tenggat', <>{formatDate(p.target_date)}{p.alasan_tenggat && <span className="block text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{p.alasan_tenggat}</span>}</>)}
        {row('Diusulkan', `${proposer} · ${formatDateTime(p.created_at)}`)}
      </section>

      <section className="rounded-2xl p-4" style={card}>
        {p.status === 'menunggu' ? (
          <ProposalDecisionForm
            id={p.id}
            judul={p.judul}
            picIds={p.pic_ids}
            targetDate={p.target_date}
            today={wibDateStr()}
            people={people}
          />
        ) : (
          <div className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
            <p>
              {st.label}{p.decided_at && ` pada ${formatDateTime(p.decided_at)}`}.
            </p>
            {p.status === 'disetujui' && (
              <p>
                Item dibuat untuk {p.pic_ids.map((x) => nameOf.get(x) ?? 'PIC tidak aktif').join(', ')} dengan tenggat {formatDate(p.target_date)}.
              </p>
            )}
            {p.status === 'ditolak' && p.alasan_tolak && <p>Alasan: {p.alasan_tolak}</p>}
          </div>
        )}
      </section>
    </div>
  )
}
