'use client'

import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div
      className="max-w-md mx-auto mt-16 text-center rounded-2xl px-6 py-10"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(11,25,41,0.05)' }}
    >
      <span className="inline-flex w-12 h-12 rounded-xl items-center justify-center mb-4" style={{ background: 'var(--bad-bg)' }}>
        <AlertTriangle size={22} style={{ color: 'var(--bad)' }} />
      </span>
      <h1 className="font-serif" style={{ fontSize: '20px', color: 'var(--navy-900)' }}>
        Terjadi kendala memuat halaman
      </h1>
      <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
        Data tidak dapat dimuat. Periksa koneksi internet Anda, lalu coba lagi.
      </p>
      <button
        onClick={reset}
        className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
        style={{ background: 'var(--navy-900)' }}
      >
        <RotateCcw size={14} />
        Coba lagi
      </button>
    </div>
  )
}
