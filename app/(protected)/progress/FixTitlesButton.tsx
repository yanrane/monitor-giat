'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Wrench } from 'lucide-react'
import { syncTitlesFromPerihal } from './fix-titles'

/** Tombol sekali pakai untuk merapikan judul tugas lama yang masih berisi kalimat perintah. */
export function FixTitlesButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  function run() {
    if (!window.confirm('Ganti semua judul tugas yang masih berupa kalimat perintah ("Agar …") dengan perihal suratnya?')) return
    startTransition(async () => {
      const r = await syncTitlesFromPerihal()
      if (r.error) { toast.error(r.error); return }
      toast.success(`${r.items} judul tugas diperbaiki (${r.proposals} usulan)`)
      setDone(true)
      router.refresh()
    })
  }

  if (done) return null

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
      style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', background: 'var(--surface)' }}
    >
      {pending ? <Loader2 size={13} className="animate-spin" /> : <Wrench size={13} />}
      Rapikan judul tugas lama
    </button>
  )
}