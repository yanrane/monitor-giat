'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Scale, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const router   = useRouter()
  const supabase = createClient()

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
      .from('profiles')
      .select('role, dept_id')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'kadiv') {
      router.push('/dashboard')
    } else if (profile?.dept_id) {
      router.push(`/departments/${profile.dept_id}`)
    } else {
      router.push('/dashboard')
    }
    router.refresh()
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

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--background)' }}>
      {/* ── Left panel — dark brand ──────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[440px] shrink-0 p-12"
        style={{ background: 'var(--navy-900)' }}
      >
        {/* Logo */}
        <div>
          <div className="flex items-center gap-3 mb-14">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--blue)' }}
            >
              <Scale size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-none tracking-tight">PT Timah Tbk</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--navy-300)' }}>Divisi Hukum</p>
            </div>
          </div>

          <h1
            className="font-serif text-white leading-tight mb-5"
            style={{ fontSize: '38px', letterSpacing: '-0.02em' }}
          >
            Sistem Monitor<br />Kegiatan Hukum
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--navy-300)' }}>
            Pantau seluruh jadwal, progres, dan output kegiatan divisi hukum dari satu tempat — kapanpun, dari mana pun.
          </p>
        </div>

        {/* Bottom stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { n: '4',        label: 'Departemen'      },
            { n: 'Real‑time', label: 'Pembaruan Data' },
            { n: '3 Peran',  label: 'Hak Akses'       },
            { n: 'Mobile',   label: 'Friendly'         },
          ].map(({ n, label }) => (
            <div
              key={label}
              className="rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="font-semibold text-base text-white leading-none mb-0.5 tracking-tight">{n}</p>
              <p className="text-xs" style={{ color: 'var(--navy-300)' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — form ───────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--navy-900)' }}
          >
            <Scale size={20} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm leading-none tracking-tight" style={{ color: 'var(--text-primary)' }}>
              PT Timah Tbk
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Divisi Hukum</p>
          </div>
        </div>

        <div className="w-full max-w-[380px]">
          <h2
            className="font-serif mb-1 tracking-tight"
            style={{ fontSize: '28px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}
          >
            Masuk
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
            Monitor Kegiatan Divisi Hukum PT Timah
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-sm font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="nama@pttimah.co.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.background = 'white'
                  e.target.style.borderColor = 'var(--blue)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'
                }}
                onBlur={(e) => {
                  e.target.style.background = 'var(--gray-100)'
                  e.target.style.borderColor = 'var(--gray-300)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.background = 'white'
                  e.target.style.borderColor = 'var(--blue)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)'
                }}
                onBlur={(e) => {
                  e.target.style.background = 'var(--gray-100)'
                  e.target.style.borderColor = 'var(--gray-300)'
                  e.target.style.boxShadow = 'none'
                }}
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
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Memproses...</>
                : 'Masuk ke Sistem'}
            </button>
          </form>

          <p
            className="text-center text-xs mt-8"
            style={{ color: 'var(--text-muted)' }}
          >
            Belum punya akun? Hubungi admin divisi.
          </p>
        </div>
      </div>
    </div>
  )
}
