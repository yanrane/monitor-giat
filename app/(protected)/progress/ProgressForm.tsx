'use client'

import { useRef, useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { type Profile } from '@/lib/types'
import { toast } from 'sonner'
import { addProgressItem } from './actions'

export function ProgressForm({ people }: { people: Profile[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function togglePic(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit(formData: FormData) {
    if (selected.size === 0) {
      toast.error('Pilih minimal satu PIC')
      return
    }
    setLoading(true)
    await addProgressItem(formData)
    formRef.current?.reset()
    setSelected(new Set())
    setLoading(false)
    toast.success(selected.size > 1 ? `Pekerjaan ditambahkan untuk ${selected.size} PIC` : 'Pekerjaan ditambahkan')
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
      className="rounded-2xl p-4 space-y-3"
      style={{ background: 'var(--surface)', border: '1px solid var(--cream-border)' }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end">
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
      </div>

      <div className="grid gap-1.5">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
          PIC — boleh pilih lebih dari satu (tiap PIC dapat baris & notifikasi sendiri)
        </span>
        <div className="flex flex-wrap gap-2">
          {people.map((p) => {
            const active = selected.has(p.id)
            return (
              <label
                key={p.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer select-none transition-colors"
                style={{
                  border: `1px solid ${active ? 'var(--blue, #2563eb)' : 'var(--cream-border)'}`,
                  background: active ? '#eff6ff' : 'white',
                  color: active ? '#1d4ed8' : 'var(--text-primary)',
                }}
              >
                <input
                  type="checkbox"
                  name="pic_id"
                  value={p.id}
                  checked={active}
                  onChange={() => togglePic(p.id)}
                  className="sr-only"
                />
                {active && <span aria-hidden>✓</span>}
                {p.full_name}
                {p.departments?.name && (
                  <span style={{ color: active ? '#60a5fa' : 'var(--text-muted)' }}>· {p.departments.name}</span>
                )}
              </label>
            )
          })}
        </div>
      </div>
    </form>
  )
}
