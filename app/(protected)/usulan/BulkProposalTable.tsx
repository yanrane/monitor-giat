'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, ExternalLink, Loader2, X } from 'lucide-react'
import { type ProgressProposal } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { bulkApprove, bulkReject, type BulkRow } from './actions'

interface Person { id: string; name: string; dept: string | null }

const field = 'w-full rounded-lg px-3 py-2 text-sm bg-white'
const border = { border: '1px solid var(--border)' }
const card = { background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(11,25,41,0.05)' }

export function BulkProposalTable({ proposals, people, today }: {
  proposals: ProgressProposal[]
  people: Person[]
  today: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [edits, setEdits] = useState<Record<string, { judul: string; targetDate: string }>>({})
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')

  const nameOf = useMemo(() => new Map(people.map((p) => [p.id, p.name])), [people])
  const allIds = proposals.map((p) => p.id)
  const allSelected = selected.size > 0 && selected.size === proposals.length

  const valueOf = (p: ProgressProposal) => edits[p.id] ?? { judul: p.judul, targetDate: p.target_date }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds))
  }

  function edit(p: ProgressProposal, patch: Partial<{ judul: string; targetDate: string }>) {
    setEdits((prev) => ({ ...prev, [p.id]: { ...valueOf(p), ...patch } }))
  }

  function approve() {
    const rows: BulkRow[] = proposals.filter((p) => selected.has(p.id)).map((p) => ({
      id: p.id, judul: valueOf(p).judul, picIds: p.pic_ids, targetDate: valueOf(p).targetDate,
    }))
    if (!rows.length) return
    if (!window.confirm(`Setujui ${rows.length} usulan? Item tugas akan dibuat untuk setiap PIC dan tidak bisa dibatalkan.`)) return

    startTransition(async () => {
      const result = await bulkApprove(rows)
      if (result.ok > 0) toast.success(`${result.ok} usulan disetujui — item Monitor Progress dibuat`)
      if (result.failed.length) {
        toast.error(`${result.failed.length} usulan gagal: ${result.failed[0].error}`)
      }
      setSelected(new Set())
      setEdits({})
      router.refresh()
    })
  }

  function reject() {
    const ids = [...selected]
    if (!ids.length) return
    if (!window.confirm(`Tolak ${ids.length} usulan? Tindakan ini tidak bisa dibatalkan.`)) return

    startTransition(async () => {
      const result = await bulkReject(ids, reason)
      if (result.ok > 0) toast.success(`${result.ok} usulan ditolak`)
      if (result.failed.length) toast.error(`${result.failed.length} usulan gagal: ${result.failed[0].error}`)
      setRejecting(false)
      setReason('')
      setSelected(new Set())
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* Bar tindakan */}
      <div className="sticky top-14 z-40 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3" style={card}>
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={allSelected} onChange={toggleAll} />
          Pilih semua
        </label>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {selected.size} dipilih
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          {!rejecting ? (
            <>
              <button
                type="button"
                disabled={pending || selected.size === 0}
                onClick={approve}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--ok)' }}
              >
                {pending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                Setujui terpilih
              </button>
              <button
                type="button"
                disabled={pending || selected.size === 0}
                onClick={() => setRejecting(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                style={{ color: 'var(--bad)', border: '1px solid var(--bad)' }}
              >
                <X size={15} /> Tolak terpilih
              </button>
            </>
          ) : (
            <>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={300}
                placeholder="Alasan menolak (opsional)"
                className={field}
                style={{ ...border, width: 240 }}
              />
              <button
                type="button"
                disabled={pending}
                onClick={reject}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--bad)' }}
              >
                {pending ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />} Tolak
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => { setRejecting(false); setReason('') }}
                className="rounded-lg px-3 py-2 text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                Batal
              </button>
            </>
          )}
        </div>
      </div>

      {/* Daftar usulan */}
      {proposals.map((p) => {
        const v = valueOf(p)
        const picked = selected.has(p.id)
        return (
          <div
            key={p.id}
            className="rounded-2xl p-4 space-y-3"
            style={{ ...card, outline: picked ? '2px solid var(--brass)' : 'none', outlineOffset: -2 }}
          >
            <div className="flex flex-wrap items-start gap-3">
              <input
                type="checkbox"
                checked={picked}
                onChange={() => toggle(p.id)}
                className="mt-1"
                aria-label={`Pilih usulan ${p.teo_ref}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  TEO {p.teo_ref}
                  {p.teo_tanggal && ` · disposisi ${formatDate(p.teo_tanggal)}`}
                </p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {p.perihal}
                </p>
              </div>
              <Link
                href={`/usulan/${p.id}`}
                className="inline-flex items-center gap-1 text-xs font-semibold shrink-0"
                style={{ color: 'var(--navy-600)' }}
              >
                Detail <ExternalLink size={12} />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <label className="space-y-1">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>Judul pekerjaan</span>
                <input
                  value={v.judul}
                  onChange={(e) => edit(p, { judul: e.target.value })}
                  maxLength={200}
                  className={field}
                  style={border}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>Tenggat</span>
                <input
                  type="date"
                  value={v.targetDate}
                  min={today}
                  onChange={(e) => edit(p, { targetDate: e.target.value })}
                  className={field}
                  style={border}
                />
              </label>
            </div>

            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              PIC: {p.pic_ids.map((id) => nameOf.get(id) ?? 'PIC tidak aktif').join(', ') || '—'}
              {p.pic_ids.length > 1 && ` (${p.pic_ids.length} orang)`}
              {' · PIC diubah pada halaman detail'}
            </p>
          </div>
        )
      })}
    </div>
  )
}