'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Circle, Loader2, Trash2 } from 'lucide-react'
import { toggleProgressItem, deleteProgressItem } from './actions'

interface ProgressToggleProps {
  itemIds: string[]
  status: string
  canToggle: boolean
}

export function ProgressToggle({ itemIds, status, canToggle }: ProgressToggleProps) {
  // Optimistis: ikon langsung berubah saat diklik; server menyusul, revert kalau gagal
  const [optimistic, setOptimistic] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => { setOptimistic(null) }, [status])

  if (!canToggle) {
    return status === 'done'
      ? <CheckCircle2 size={18} style={{ color: '#1e7a56' }} className="shrink-0" />
      : <div className="w-[18px] h-[18px] rounded-full shrink-0" style={{ border: '1.5px solid #d1d5db' }} />
  }

  const shown = optimistic ?? status

  async function handleToggle() {
    if (saving) return
    setOptimistic(status === 'done' ? 'pending' : 'done')
    setSaving(true)
    try {
      await toggleProgressItem(itemIds, status)
    } catch {
      setOptimistic(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      className={`shrink-0 transition-all active:scale-90 hover:opacity-70 ${saving ? 'animate-pulse' : ''}`}
      title={shown === 'done' ? 'Tandai belum selesai' : 'Tandai selesai'}
    >
      {shown === 'done'
        ? <CheckCircle2 size={18} style={{ color: '#1e7a56' }} />
        : <Circle size={18} style={{ color: '#9ca3af' }} />}
    </button>
  )
}

export function ProgressDelete({ itemIds }: { itemIds: string[] }) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    const msg = itemIds.length > 1
      ? `Hapus item pekerjaan ini untuk ${itemIds.length} PIC sekaligus?`
      : 'Hapus item pekerjaan ini?'
    if (!confirm(msg)) return
    setLoading(true)
    await deleteProgressItem(itemIds)
  }

  if (loading) return <Loader2 size={14} className="animate-spin shrink-0" style={{ color: '#9ca3af' }} />

  return (
    <button
      onClick={handleDelete}
      className="shrink-0 p-1.5 rounded-lg transition-colors hover:bg-red-50"
      style={{ color: '#9ca3af' }}
      title="Hapus"
    >
      <Trash2 size={14} className="hover:text-red-600" />
    </button>
  )
}
