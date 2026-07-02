'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Loader2, Plus, Search, X } from 'lucide-react'
import { type Profile } from '@/lib/types'
import { toast } from 'sonner'
import { addProgressItem } from './actions'

export function ProgressForm({ people }: { people: Profile[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

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
    setQuery('')
    setLoading(false)
    toast.success(selected.size > 1 ? `Pekerjaan ditambahkan untuk ${selected.size} PIC` : 'Pekerjaan ditambahkan')
  }

  const inputStyle = {
    border: '1px solid var(--cream-border)',
    background: 'white',
    color: 'var(--text-primary)',
  }

  const peopleById = new Map(people.map((p) => [p.id, p]))

  // Group by department, filtered by search query
  const filtered = people.filter((p) => p.full_name.toLowerCase().includes(query.toLowerCase()))
  const groups = new Map<string, Profile[]>()
  for (const p of filtered) {
    const dept = p.departments?.name ?? 'Lainnya'
    if (!groups.has(dept)) groups.set(dept, [])
    groups.get(dept)!.push(p)
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="rounded-2xl p-4 space-y-3"
      style={{ background: 'var(--surface)', border: '1px solid var(--cream-border)' }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_190px_160px_auto] sm:items-end">
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

        <div className="grid gap-1 relative" ref={pickerRef}>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>PIC</span>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="h-9 rounded-lg px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 flex items-center justify-between gap-2"
            style={{
              ...inputStyle,
              color: selected.size > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
              borderColor: open ? 'var(--blue, #2563eb)' : 'var(--cream-border)',
            }}
          >
            <span className="truncate">
              {selected.size === 0
                ? 'Pilih PIC...'
                : selected.size === 1
                  ? peopleById.get([...selected][0])?.full_name
                  : `${selected.size} PIC dipilih`}
            </span>
            <ChevronDown size={14} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
          </button>

          {/* Selected ids as hidden inputs so FormData works even when panel is closed */}
          {[...selected].map((id) => (
            <input key={id} type="hidden" name="pic_id" value={id} />
          ))}

          {open && (
            <div
              className="absolute top-full left-0 z-20 mt-1 w-72 rounded-xl bg-white shadow-lg overflow-hidden"
              style={{ border: '1px solid var(--cream-border)' }}
            >
              <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--cream-border)' }}>
                <Search size={13} style={{ color: 'var(--text-muted)' }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari nama..."
                  className="w-full text-sm outline-none bg-transparent"
                  style={{ color: 'var(--text-primary)' }}
                  autoFocus
                />
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {filtered.length === 0 && (
                  <p className="px-3 py-3 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                    Tidak ada nama yang cocok.
                  </p>
                )}
                {[...groups.entries()].map(([dept, members]) => (
                  <div key={dept}>
                    <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      {dept}
                    </p>
                    {members.map((p) => {
                      const active = selected.has(p.id)
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => togglePic(p.id)}
                          className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors hover:bg-gray-50"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          <span
                            className="w-4 h-4 rounded flex items-center justify-center shrink-0 text-[10px] text-white"
                            style={{
                              border: `1px solid ${active ? 'var(--blue, #2563eb)' : 'var(--gray-300, #d1d5db)'}`,
                              background: active ? 'var(--blue, #2563eb)' : 'white',
                            }}
                          >
                            {active && '✓'}
                          </span>
                          <span className="truncate">{p.full_name}</span>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

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

      {selected.size > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {[...selected].map((id) => {
            const p = peopleById.get(id)
            if (!p) return null
            return (
              <span
                key={id}
                className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium"
                style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
              >
                {p.full_name}
                <button
                  type="button"
                  onClick={() => togglePic(id)}
                  className="rounded-full p-0.5 transition-colors hover:bg-blue-100"
                  aria-label={`Hapus ${p.full_name}`}
                >
                  <X size={11} />
                </button>
              </span>
            )
          })}
        </div>
      )}
    </form>
  )
}
