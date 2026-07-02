'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, Loader2, Trash2 } from 'lucide-react'
import { toggleProgressItem, deleteProgressItem } from './actions'

interface ProgressRowActionsProps {
  itemId: string
  status: string
  canToggle: boolean
  canDelete: boolean
}

export function ProgressToggle({ itemId, status, canToggle }: Omit<ProgressRowActionsProps, 'canDelete'>) {
  const [loading, setLoading] = useState(false)

  if (!canToggle) {
    return status === 'done'
      ? <CheckCircle2 size={18} style={{ color: '#10b981' }} className="shrink-0" />
      : <div className="w-[18px] h-[18px] rounded-full shrink-0" style={{ border: '1.5px solid #d1d5db' }} />
  }

  async function handleToggle() {
    setLoading(true)
    await toggleProgressItem(itemId, status)
    setLoading(false)
  }

  if (loading) return <Loader2 size={18} className="animate-spin shrink-0" style={{ color: '#3b82f6' }} />

  return (
    <button onClick={handleToggle} className="shrink-0 transition-opacity hover:opacity-70" title={status === 'done' ? 'Tandai belum selesai' : 'Tandai selesai'}>
      {status === 'done'
        ? <CheckCircle2 size={18} style={{ color: '#10b981' }} />
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
