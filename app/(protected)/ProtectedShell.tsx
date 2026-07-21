'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { type Profile } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { NotificationBell } from '@/components/NotificationBell'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { LayoutDashboard, Building2, Calendar, Bell, Shield, LogOut, ClipboardList, Users, Receipt, CheckSquare, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProtectedShellProps {
  profile: Profile
  children: React.ReactNode
}

const ROLE_LABELS: Record<string, string> = {
  kadiv: 'Kepala Divisi',
  dept_head: 'Dept Head',
  staff: 'Staf',
}

export function ProtectedShell({ profile, children }: ProtectedShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isKadiv = profile.role === 'kadiv'

  const isDeptHead = profile.role === 'dept_head'

  const navItems = [
    ...(isKadiv ? [{ href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }] : []),
    ...(!isKadiv ? [{ href: `/departments/${profile.dept_id}`, icon: Building2, label: 'Kegiatan' }] : []),
    ...(!isKadiv ? [{ href: '/daily-log', icon: ClipboardList, label: 'Log Harian' }] : []),
    ...(isKadiv || isDeptHead ? [{ href: '/monitor', icon: Users, label: 'Monitor Tim' }] : []),
    { href: '/progress', icon: CheckSquare, label: 'Monitor Progress' },
    { href: '/administrasi', icon: FolderOpen, label: 'Administrasi' },
    { href: '/calendar', icon: Calendar, label: 'Kalender' },
    { href: '/expenses', icon: Receipt, label: 'Pengeluaran' },
    { href: '/notifications', icon: Bell, label: 'Notifikasi' },
    ...(isKadiv ? [{ href: '/admin', icon: Shield, label: 'Kelola Akun' }] : []),
  ]

  const initials = profile.full_name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--background)' }}>
      {/* ── Header ───────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: 'var(--navy-900)',
          borderColor: 'rgba(255,255,255,0.06)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192.png" alt="Logo PT Timah" className="w-8 h-8 rounded-lg shrink-0" />
            <div className="hidden sm:block">
              <p className="text-white font-semibold text-sm leading-none tracking-tight">Monitor Kegiatan</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--navy-300)' }}>Divisi Hukum PT Timah</p>
            </div>
            <p className="sm:hidden text-white font-semibold text-sm tracking-tight">MK Hukum</p>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <NotificationBell userId={profile.id} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <Avatar className="w-7 h-7">
                    <AvatarFallback
                      className="text-xs font-semibold"
                      style={{ background: 'var(--navy-600)', color: 'white' }}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <p className="text-white text-xs font-semibold leading-none tracking-tight">{profile.full_name.split(' ')[0]}</p>
                    <p className="text-xs leading-none mt-0.5" style={{ color: 'var(--navy-300)' }}>
                      {ROLE_LABELS[profile.role]}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2.5 border-b" style={{ borderColor: 'var(--separator)' }}>
                  <p className="text-sm font-semibold">{profile.full_name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {ROLE_LABELS[profile.role]}
                    {profile.departments && ` · ${profile.departments.name}`}
                  </p>
                </div>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="mt-1"
                  style={{ color: 'var(--destructive)' }}
                >
                  <LogOut size={14} className="mr-2" />
                  Keluar dari Sistem
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        {/* Sidebar (desktop) */}
        <nav
          className="hidden md:flex flex-col w-52 shrink-0 pt-5 pr-2 pb-6 pl-2 gap-0.5"
          style={{ background: 'linear-gradient(180deg, var(--navy-950), var(--navy-900))' }}
        >
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-100',
                  active ? '' : 'hover:bg-white/[0.06] hover:text-white'
                )}
                style={
                  active
                    ? { background: 'rgba(176,134,47,0.16)', color: '#fff', fontWeight: 600 }
                    : { color: '#b4c2d8' }
                }
              >
                {active && (
                  <span
                    className="absolute -left-2 top-1.5 bottom-1.5 w-[3px] rounded-r"
                    style={{ background: 'var(--brass)' }}
                  />
                )}
                <item.icon size={15} style={active ? { color: 'var(--brass)' } : undefined} />
                {item.label}
              </Link>
            )
          })}

          {/* Dept info card for non-kadiv */}
          {!isKadiv && profile.departments && (
            <div
              className="mt-auto mx-1 rounded-xl p-3"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
            >
              <p className="text-xs font-semibold mb-0.5" style={{ color: '#e8eef7' }}>Departemen</p>
              <p className="text-xs leading-snug" style={{ color: '#8fa2c0' }}>
                {profile.departments.name}
              </p>
            </div>
          )}
        </nav>

        {/* Main content */}
        <main className="flex-1 px-5 py-6 pb-24 md:pb-8 min-w-0" style={{ background: 'var(--background)' }}>
          {children}
        </main>
      </div>

      {/* ── Bottom nav (mobile) ───────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t"
        style={{
          background: 'var(--navy-900)',
          borderColor: 'rgba(255,255,255,0.08)',
          boxShadow: '0 -1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <div className="flex justify-around">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 py-2.5 px-2 transition-colors"
                style={{ color: active ? '#d9b45f' : 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: active ? 600 : 400 }}
              >
                <item.icon size={19} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
