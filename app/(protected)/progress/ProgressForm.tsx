'use client'

import { useRef, useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { type Profile } from '@/lib/types'
import { addProgressItem } from './actions'

const ROLE_LABELS: Record<string, string> = {
  dept_head: 'Dept Head',
  staff: 'Staf',
}

export function ProgressForm({ people }: { people: Profile[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    await addProgressItem(formData)
    formRef.current?.reset()
    setLoading(false)
  }

  const inputStyle = {
    border: '1px solid var(--cream-border)',
    background: 'white',
    color: 'var(--text-primary)',
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="rounded-2xl p-4 grid gap-3 sm:grid-cols-[1fr_220px_160px_auto] sm:items-end"
      style={{ background: 'var(--surface)', border: '1px solid var(--cream-border)' }}
    >
      <label className="grid gap-1">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Item Pekerjaan</span>
        <input
          name="title"
          required
          placeholder="cth: Review draft perjanjian sewa lahan"
          className="h-9 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
          style={inputStyle}
        />
      </label>

      <label className="grid gap-1">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>PIC</span>
        <select
          name="pic_id"
          required
          defaultValue=""
          className="h-9 rounded-lg px-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
          style={inputStyle}
        >
          <option value="" disabled>Pilih PIC…</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
              {p.departments?.name ? ` — ${p.departments.name}` : ''}
              {ROLE_LABELS[p.role] ? ` (${ROLE_LABELS[p.role]})` : ''}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Target Selesai</span>
        <input
          name="target_date"
          type="date"
          required
          className="h-9 rounded-lg px-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
          style={inputStyle}
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="h-9 px-4 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: 'var(--blue, #2563eb)' }}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        Tambah
      </button>
    </form>
  )
}
