'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Wrench } from 'lucide-react'
import { syncTitlesFromPerihal } from './fix-titles'

/**
 * Merapikan judul tugas lama yang masih berisi kalimat perintah.
 * Server memproses per potongan, jadi tombol ini memanggil berulang sampai sisa = 0.
 */
export function FixTitlesButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  function run() {
    if (!window.confirm('Ganti semua judul tugas yang masih berupa kalimat perintah ("Agar …") dengan perihal suratnya?')) return

    startTransition(async () => {
      let totalItems = 0
      let totalProposals = 0
      for (let i = 0; i < 12; i++) {
        const r = await syncTitlesFromPerihal()
        if (r.remaining < 0) { toast.error(r.error ?? 'Gagal memperbaiki judul'); break }
        totalItems += r.items
        totalProposals += r.proposals
        if (r.remaining <= 0) {
          if (r.error) toast.error(r.error)
          break
        }
      }
      if (totalItems || totalProposals) {
        toast.success(`${totalItems} judul tugas diperbaiki (${totalProposals} usulan)`)
        setDone(true)
      } else {
        toast.info('Tidak ada judul yang perlu diperbaiki')
      }
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
      {pending ? 'Merapikan…' : 'Rapikan judul tugas lama'}
    </button>
  )
}