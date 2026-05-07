'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Scale, Loader2 } from 'lucide-react'
import { type Department } from '@/lib/types'

export default function LoginPage() {
  const [mode, setMode]           = useState<'login' | 'register' | 'forgot'>('login')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [fullName, setFullName]   = useState('')
  const [deptId, setDeptId]       = useState('')
  const [departments, setDepts]   = useState<Department[]>([])
  const [loading, setLoading]     = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.from('departments').select('*').order('name').then(({ data }) => {
      if (data) setDepts(data)
    })
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error('Email atau password salah')
      setLoading(false)
      return
    }
    const { data: profile } = await supabase
      .from('profiles').select('role, dept_id').eq('id', data.user.id).single()
    if (profile?.role === 'kadiv') {
      router.push('/dashboard')
    } else if (profile?.dept_id) {
      router.push(`/departments/${profile.dept_id}`)
    } else {
      router.push('/dashboard')
    }
    router.refresh()
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    })
    setLoading(false)
    if (error) {
      toast.error('Gagal mengirim email reset password')
    } else {
      toast.success('Link reset password telah dikirim ke email Anda')
      setMode('login')
      setEmail('')
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!deptId) { toast.error('Pilih departemen'); return }
    if (fullName.trim().length < 3) { toast.error('Nama minimal 3 karakter'); return }
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error || !data.user) {
      toast.error(error?.message ?? 'Gagal mendaftar')
      setLoading(false)
      return
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: fullName.trim(),
      role: 'staff',
      dept_id: deptId,
    })

    if (profileError) {
      toast.error('Gagal menyimpan profil')
      setLoading(false)
      return
    }

    toast.success('Akun berhasil dibuat! Silakan masuk.')
    setMode('login')
    setPassword('')
    setFullName('')
    setDeptId('')
    setLoading(false)
  }

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

  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.background = 'white'
    e.target.style.borderColor = 'var(--blue)'
    e.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'
  }
  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.background = 'var(--gray-100)'
    e.target.style.borderColor = 'var(--gray-300)'
    e.target.style.boxShadow = 'none'
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--background)' }}>
      {/* ── Left panel ───────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[440px] shrink-0 p-12"
        style={{ background: 'var(--navy-900)' }}
      >
        <div>
          <div className="flex items-center gap-3 mb-14">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--blue)' }}>
              <Scale size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-none tracking-tight">PT Timah Tbk</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--navy-300)' }}>Divisi Hukum</p>
            </div>
          </div>
          <h1 className="font-serif text-white leading-tight mb-5" style={{ fontSize: '38px', letterSpacing: '-0.02em' }}>
            Sistem Monitor<br />Kegiatan Hukum
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--navy-300)' }}>
            Pantau seluruh jadwal, progres, dan output kegiatan divisi hukum dari satu tempat — kapanpun, dari mana pun.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { n: '4', label: 'Departemen' },
            { n: 'Real‑time', label: 'Pembaruan Data' },
            { n: '3 Peran', label: 'Hak Akses' },
            { n: 'Mobile', label: 'Friendly' },
          ].map(({ n, label }) => (
            <div key={label} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="font-semibold text-base text-white leading-none mb-0.5 tracking-tight">{n}</p>
              <p className="text-xs" style={{ color: 'var(--navy-300)' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Mobile logo — lebih besar */}
        <div className="lg:hidden flex flex-col items-center gap-3 mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--navy-900)' }}
          >
            <Scale size={32} className="text-white" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-lg leading-none tracking-tight" style={{ color: 'var(--text-primary)' }}>
              PT Timah Tbk
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Divisi Hukum</p>
          </div>
        </div>

        <div className="w-full max-w-[380px]">
          {/* Judul — tengah di mobile */}
          <h2
            className="font-serif tracking-tight text-center lg:text-left mb-1"
            style={{ fontSize: '22px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
          >
            {mode === 'login' ? 'Masuk' : mode === 'forgot' ? 'Lupa Password' : 'Buat Akun'}
          </h2>
          <p className="text-sm mb-6 text-center lg:text-left" style={{ color: 'var(--text-muted)' }}>
            {mode === 'login'
              ? 'Monitor Kegiatan Divisi Hukum PT Timah'
              : mode === 'forgot'
              ? 'Masukkan email Anda untuk menerima link reset password'
              : 'Buat akun untuk mengakses kegiatan departemen'}
          </p>

          {/* ── Login form ── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Email</label>
                <input
                  type="email" placeholder="nama@pttimah.co.id"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  required autoComplete="email" style={inputStyle}
                  onFocus={focusStyle} onBlur={blurStyle}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Password</label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-xs font-medium"
                    style={{ color: 'var(--blue)' }}
                  >
                    Lupa Password?
                  </button>
                </div>
                <input
                  type="password" placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  required autoComplete="current-password" style={inputStyle}
                  onFocus={focusStyle} onBlur={blurStyle}
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ padding: '11px', background: loading ? 'var(--blue-dark)' : 'var(--blue)', boxShadow: loading ? 'none' : '0 2px 8px rgba(0,113,227,0.3)', letterSpacing: '-0.01em' }}
              >
                {loading ? <><Loader2 size={15} className="animate-spin" /> Memproses...</> : 'Masuk ke Sistem'}
              </button>
            </form>
          )}

          {/* ── Register form ── */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Nama Lengkap</label>
                <input
                  type="text" placeholder="Nama sesuai identitas"
                  value={fullName} onChange={(e) => setFullName(e.target.value)}
                  required style={inputStyle}
                  onFocus={focusStyle} onBlur={blurStyle}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Email</label>
                <input
                  type="email" placeholder="nama@pttimah.co.id"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  required autoComplete="email" style={inputStyle}
                  onFocus={focusStyle} onBlur={blurStyle}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Password</label>
                <input
                  type="password" placeholder="Minimal 6 karakter"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  required minLength={6} autoComplete="new-password" style={inputStyle}
                  onFocus={focusStyle} onBlur={blurStyle}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Departemen</label>
                <select
                  value={deptId} onChange={(e) => setDeptId(e.target.value)}
                  required
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  onFocus={focusStyle} onBlur={blurStyle}
                >
                  <option value="">Pilih departemen...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ padding: '11px', background: loading ? 'var(--blue-dark)' : 'var(--blue)', boxShadow: loading ? 'none' : '0 2px 8px rgba(0,113,227,0.3)', letterSpacing: '-0.01em' }}
              >
                {loading ? <><Loader2 size={15} className="animate-spin" /> Mendaftar...</> : 'Buat Akun'}
              </button>
            </form>
          )}

          {/* ── Forgot password form ── */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Email</label>
                <input
                  type="email" placeholder="nama@pttimah.co.id"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  required autoComplete="email" style={inputStyle}
                  onFocus={focusStyle} onBlur={blurStyle}
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ padding: '11px', background: loading ? 'var(--blue-dark)' : 'var(--blue)', boxShadow: loading ? 'none' : '0 2px 8px rgba(0,113,227,0.3)', letterSpacing: '-0.01em' }}
              >
                {loading ? <><Loader2 size={15} className="animate-spin" /> Mengirim...</> : 'Kirim Link Reset Password'}
              </button>
            </form>
          )}

          {/* Toggle login/register */}
          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
            {mode === 'login' ? (
              <>Belum punya akun?{' '}
                <button onClick={() => setMode('register')} className="font-semibold" style={{ color: 'var(--blue)' }}>
                  Daftar di sini
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { setMode('login'); setEmail('') }} className="font-semibold" style={{ color: 'var(--blue)' }}>
                  ← Kembali ke halaman login
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
