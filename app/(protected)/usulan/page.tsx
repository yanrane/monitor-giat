import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { wibDateStr } from '@/lib/utils'
import { type ProgressProposal } from '@/lib/types'
import { BulkProposalTable } from './BulkProposalTable'

// Daftar usulan target dari disposisi TEO — khusus Kadiv.
// Halaman ini melengkapi halaman per-item (/usulan/[id]) dengan persetujuan beberapa usulan sekaligus.
export const dynamic = 'force-dynamic'

export default async function ProposalListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=${encodeURIComponent('/usulan')}`)

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'kadiv') notFound()

  const [{ data: rows, error }, { data: peopleRaw }] = await Promise.all([
    supabase
      .from('progress_proposals')
      .select('*')
      .eq('status', 'menunggu')
      .order('target_date', { ascending: true })
      .order('teo_ref', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, full_name, departments(name)')
      .eq('is_active', true)
      .neq('role', 'kadiv')
      .order('full_name'),
  ])

  const proposals = (rows ?? []) as ProgressProposal[]
  const people = ((peopleRaw ?? []) as unknown as { id: string; full_name: string; departments: { name: string } | null }[])
    .map((x) => ({ id: x.id, name: x.full_name, dept: x.departments?.name ?? null }))

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <p className="text-xs font-bold tracking-wide" style={{ color: 'var(--text-muted)' }}>
          USULAN TARGET DARI DISPOSISI TEO
        </p>
        <h1 className="font-serif leading-tight mt-1" style={{ fontSize: '26px', color: 'var(--navy-900)' }}>
          Persetujuan Usulan
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {error
            ? 'Daftar usulan tidak dapat dibaca saat ini.'
            : proposals.length === 0
              ? 'Tidak ada usulan yang menunggu keputusan.'
              : `${proposals.length} usulan menunggu keputusan. Pilih yang disetujui, lalu setujui sekaligus.`}
        </p>
      </div>

      {proposals.length > 0 && (
        <BulkProposalTable proposals={proposals} people={people} today={wibDateStr()} />
      )}
    </div>
  )
}