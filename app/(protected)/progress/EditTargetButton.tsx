'use client'

import { useState } from 'react'
import { Loader2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { updateProgressTarget } from './actions'

interface EditTargetButtonProps {
  itemIds: string[]
  title: string
  targetDate: string
}

export function EditTargetButton({ itemIds, title, targetDate }: EditTargetButtonProps) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(targetDate)
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    await updateProgressTarget(itemIds, date)
    setLoading(false)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="shrink-0 p-1.5 rounded-lg transition-colors hover:bg-blue-50"
          style={{ color: '#9ca3af' }}
          title="Revisi target selesai"
        >
          <Pencil size={14} />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revisi Target Selesai</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{title}</p>
          <div className="space-y-1.5">
            <Label>Target selesai baru</Label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <Button onClick={handleSave} disabled={loading || !date} className="w-full">
            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Simpan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
