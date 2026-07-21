import Link from 'next/link'
import { Scale, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-dvh flex items-center justify-center px-4" style={{ background: 'var(--background)' }}>
      <div
        className="max-w-md w-full text-center rounded-2xl px-6 py-12"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(11,25,41,0.05)' }}
      >
        <span className="inline-flex w-12 h-12 rounded-xl items-center justify-center mb-4" style={{ background: 'var(--brass)' }}>
          <Scale size={22} style={{ color: 'var(--navy-950)' }} />
        </span>
        <p className="font-serif tabular-nums" style={{ fontSize: '44px', color: 'var(--navy-900)', lineHeight: 1 }}>404</p>
        <h1 className="text-sm font-semibold mt-3" style={{ color: 'var(--text-primary)' }}>
          Halaman tidak ditemukan
        </h1>
        <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>
          Alamat yang Anda buka tidak ada atau sudah dipindahkan.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'var(--navy-900)' }}
        >
          <ArrowLeft size={14} />
          Kembali ke halaman utama
        </Link>
      </div>
    </div>
  )
}
