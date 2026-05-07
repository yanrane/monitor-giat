'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Scale, Loader2, KeyRound } from 'lucide-react'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: '10px',
    fontSize: '15px',
    outline: 'none',
    transition: 'all 0.15s',
    background: 'var(--gray-100)',
    border: '1px solid var(--gray-300)',
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
    letterSpacing: '-0.01em',
  }

  const focusStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.background = 'white'
    e.target.style.borderColor = 'var(--blue)'
    e.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'
  }
  const blurStyle = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.background = 'var(--gray-100)'
    e.target.style.borderColor = 'var(--gray-300)'
    e.target.style.boxShadow = 'none'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Password tidak sama')
      return
    }
    if (password.length < 6) {
      toast.error('Password minimal 6 karakter')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error(`Gagal memperbarui password: ${error.message}`)
    } else {
      toast.success('Password berhasil diperbarui!')
      router.push('/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-[380px]">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--navy-900)' }}>
            <KeyRound size={26} className="text-white" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-lg leading-none tracking-tight" style={{ color: 'var(--text-primary)' }}>
              PT Timah Tbk
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Divisi Hukum</p>
          </div>
        </div>

        <h2
          className="font-serif tracking-tight text-center mb-1"
          style={{ fontSize: '22px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
        >
          Buat Password Baru
        </h2>
        <p className="text-sm mb-6 text-center" style={{ color: 'var(--text-muted)' }}>
          Masukkan password baru untuk akun Anda
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Password Baru
            </label>
            <input
              type="password"
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={inputStyle}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Konfirmasi Password
            </label>
            <input
              type="password"
              placeholder="Ulangi password baru"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              style={inputStyle}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition-all"
            style={{
              padding: '11px',
              background: loading ? 'var(--blue-dark)' : 'var(--blue)',
              boxShadow: loading ? 'none' : '0 2px 8px rgba(0,113,227,0.3)',
              letterSpacing: '-0.01em',
            }}
          >
            {loading ? <><Loader2 size={15} className="animate-spin" /> Menyimpan...</> : 'Simpan Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
