'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, Loader2, X } from 'lucide-react'
import { approveProposal, rejectProposal } from './actions'

interface Person { id: string; name: string; dept: string | null }

export function ProposalDecisionForm({ id, judul, picIds, targetDate, today, people }: {
  id: string
  judul: string
  picIds: string[]
  targetDate: string
  today: string
  people: Person[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [rejecting, setRejecting] = useState(false)

  function run(action: typeof approveProposal, form: HTMLFormElement, okMessage: string) {
    const data = new FormData(form)
    startTransition(async () => {
      const result = await action(id, data)
      if (result.error) {
        toast.error(result.error)
        router.refresh()
        return
      }
      toast.success(okMessage)
      router.refresh()
    })
  }

  const field = 'w-full rounded-lg px-3 py-2 text-sm bg-white'
  const border = { border: '1px solid var(--border)' }

  return (
    // Enter / tombol "Go" di HP tidak boleh menyetujui: persetujuan tidak bisa dibatalkan,
    // jadi hanya klik tombol Setujui yang menjalankannya.
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Judul pekerjaan</span>
        <input name="title" defaultValue={judul} maxLength={200} required className={field} style={border} />
      </label>

      <fieldset className="space-y-1.5">
        <legend className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>PIC</legend>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {people.map((p) => (
            <label key={p.id} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer bg-white" style={border}>
              <input type="checkbox" name="pic_id" value={p.id} defaultChecked={picIds.includes(p.id)} />
              <span className="truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
              {p.dept && <span className="ml-auto text-[11px] shrink-0" style={{ color: 'var(--text-muted)' }}>{p.dept}</span>}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Tenggat</span>
        <input type="date" name="target_date" defaultValue={targetDate} min={today} required className={field} style={border} />
      </label>

      {rejecting && (
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Alasan menolak (opsional)</span>
          <textarea name="alasan_tolak" maxLength={300} rows={2} className={field} style={border} />
        </label>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {!rejecting ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={(e) => {
                const form = e.currentTarget.form!
                if (!form.reportValidity()) return
                run(approveProposal, form, 'Usulan disetujui — item Monitor Progress dibuat')
              }}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: 'var(--ok)' }}
            >
              {pending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Setujui
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setRejecting(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
              style={{ color: 'var(--bad)', border: '1px solid var(--bad)' }}
            >
              <X size={15} /> Tolak
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={(e) => run(rejectProposal, e.currentTarget.form!, 'Usulan ditolak')}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: 'var(--bad)' }}
            >
              {pending ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />} Tolak usulan
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setRejecting(false)}
              className="rounded-lg px-4 py-2 text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              Batal
            </button>
          </>
        )}
      </div>
    </form>
  )
}
