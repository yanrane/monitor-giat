import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { type Notification } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'
import { MarkAllReadButton } from './MarkAllReadButton'
import { Bell, BellRing, MessageSquare, Clock, Newspaper } from 'lucide-react'

const TYPE_ICONS = {
  status_change:     Bell,
  new_comment:       MessageSquare,
  deadline_reminder: Clock,
  briefing:          Newspaper,
}

const TYPE_LABELS = {
  status_change:     'Perubahan Status',
  new_comment:       'Komentar Baru',
  deadline_reminder: 'Pengingat Tenggat',
  briefing:          'Briefing Pagi',
}

const TYPE_COLORS = {
  status_change:     { bg: 'var(--navy-100)', color: 'var(--navy-600)' },
  new_comment:       { bg: 'var(--gold-100)', color: 'var(--gold-600)' },
  deadline_reminder: { bg: '#fbeeec',         color: '#b3362a'         },
  briefing:          { bg: '#e9f5ef',         color: '#1e7a56'         },
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*, activities(id, title)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const notifs      = notifications as Notification[] ?? []
  const unreadCount = notifs.filter((n) => !n.is_read).length

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif leading-tight" style={{ fontSize: '26px', color: 'var(--navy-900)' }}>
            Notifikasi
          </h1>
          {unreadCount > 0 && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {unreadCount} belum dibaca
            </p>
          )}
        </div>
        {unreadCount > 0 && <MarkAllReadButton userId={user.id} />}
      </div>

      {notifs.length === 0 ? (
        <div
          className="text-center py-16 rounded-2xl"
          style={{ background: 'white', border: '1px solid var(--cream-border)' }}
        >
          <BellRing size={36} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--navy-900)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada notifikasi.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => {
            const Icon  = TYPE_ICONS[n.type]
            const clr   = TYPE_COLORS[n.type]
            return (
              <Link
                key={n.id}
                href={n.activity_id ? `/activities/${n.activity_id}` : '/notifications'}
              >
                <div
                  className="flex items-start gap-3 bg-white rounded-xl px-4 py-3.5 transition-all hover:shadow-md hover:-translate-y-px cursor-pointer"
                  style={{
                    border: n.is_read
                      ? '1px solid var(--cream-border)'
                      : '1px solid var(--navy-100)',
                    boxShadow: n.is_read
                      ? '0 1px 4px rgba(11,25,41,0.04)'
                      : '0 2px 8px rgba(11,25,41,0.08)',
                  }}
                >
                  {/* Icon bubble */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: clr.bg }}
                  >
                    <Icon size={14} style={{ color: clr.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: clr.color }}>
                        {TYPE_LABELS[n.type]}
                      </span>
                      {!n.is_read && (
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--navy-600)' }} />
                      )}
                    </div>
                    <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                      {n.title}
                    </p>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {n.message}
                    </p>
                    <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                      {formatDateTime(n.created_at)}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
