'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Profile, type DailyLog, type Department } from '@/lib/types'
import { ChevronLeft, ChevronRight, Users, CheckCircle2, XCircle, BarChart2 } from 'lucide-react'

function toLocalDateString(date: Date) {
  return date.toLocaleDateString('sv-SE')
}

function formatDisplayDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

type MemberWithLog = Profile & { log: DailyLog | null; activityCount: number }
type GroupedByDept = { dept: Department | null; members: MemberWithLog[] }[]

export default function MonitorPage() {
  const supabase = createClient()
  const today = toLocalDateString(new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const [role, setRole] = useState<string | null>(null)
  const [groups, setGroups] = useState<GroupedByDept>([])
  const [loading, setLoading] = useState(true)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: currentProfile } = await supabase
      .from('profiles').select('role, dept_id').eq('id', user.id).single()
    if (!currentProfile) return
    setRole(currentProfile.role)

    // Fetch members based on role
    const membersQuery = currentProfile.role === 'kadiv'
      ? supabase.from('profiles').select('*, departments(*)').neq('role', 'kadiv').eq('is_active', true).order('full_name')
      : supabase.from('profiles').select('*, departments(*)').eq('dept_id', currentProfile.dept_id!).neq('id', user.id).eq('is_active', true).order('full_name')

    const [{ data: members }, { data: logs }, { data: activities }] = await Promise.all([
      membersQuery,
      supabase.from('daily_logs').select('*').eq('log_date', selectedDate),
      supabase.from('activities').select('created_by, pic_id, status'),
    ])

    const memberList = members as (Profile & { departments: Department })[] ?? []
    const logMap = new Map<string, DailyLog>()
    for (const log of (logs ?? []) as DailyLog[]) logMap.set(log.user_id, log)

    const activityCountMap = new Map<string, number>()
    for (const a of activities ?? []) {
      if (a.created_by) activityCountMap.set(a.created_by, (activityCountMap.get(a.created_by) ?? 0) + 1)
      if (a.pic_id && a.pic_id !== a.created_by) activityCountMap.set(a.pic_id, (activityCountMap.get(a.pic_id) ?? 0) + 1)
    }

    const withLogs: MemberWithLog[] = memberList.map((m) => ({
      ...m,
      log: logMap.get(m.id) ?? null,
      activityCount: activityCountMap.get(m.id) ?? 0,
    }))

    const sortMembers = (members: MemberWithLog[]) =>
      members.sort((a, b) => {
        if (a.role === 'dept_head' && b.role !== 'dept_head') return -1
        if (a.role !== 'dept_head' && b.role === 'dept_head') return 1
        return a.full_name.localeCompare(b.full_name, 'id')
      })

    // Group by department
    if (currentProfile.role === 'kadiv') {
      const deptMap = new Map<string, { dept: Department; members: MemberWithLog[] }>()
      for (const m of withLogs) {
        const key = m.dept_id ?? 'none'
        const dept = (m as any).departments as Department
        if (!deptMap.has(key)) deptMap.set(key, { dept, members: [] })
        deptMap.get(key)!.members.push(m)
      }
      const grouped = Array.from(deptMap.values())
      grouped.forEach((g) => sortMembers(g.members))
      setGroups(grouped)
    } else {
      setGroups([{ dept: null, members: sortMembers(withLogs) }])
    }

    setLoading(false)
  }, [selectedDate]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData() }, [loadData])

  function shiftDate(days: number) {
    const [y, m, d] = selectedDate.split('-').map(Number)
    setSelectedDate(toLocalDateString(new Date(y, m - 1, d + days)))
  }

  const isToday = selectedDate === today
  const totalMembers = groups.reduce((s, g) => s + g.members.length, 0)
  const totalFilled = groups.reduce((s, g) => s + g.members.filter((m) => m.log).length, 0)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--navy-900)' }}>
          <Users size={18} className="text-white" />
        </div>
        <div>
          <h1 className="font-serif leading-tight" style={{ fontSize: '26px', color: 'var(--navy-900)' }}>
            Monitor Tim
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Pantau log harian dan kegiatan anggota
          </p>
        </div>
      </div>

      {/* Date navigator */}
      <div
        className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3"
        style={{ border: '1px solid var(--cream-border)', boxShadow: '0 1px 4px rgba(11,25,41,0.04)' }}
      >
        <button onClick={() => shiftDate(-1)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
          <ChevronLeft size={16} style={{ color: 'var(--text-muted)' }} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {isToday ? 'Hari ini — ' : ''}{formatDisplayDate(selectedDate)}
          </p>
        </div>
        <button onClick={() => shiftDate(1)} disabled={isToday} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 disabled:opacity-30">
          <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Summary bar */}
      {!loading && totalMembers > 0 && (
        <div
          className="grid grid-cols-3 gap-3 bg-white rounded-2xl p-4"
          style={{ border: '1px solid var(--cream-border)', boxShadow: '0 1px 4px rgba(11,25,41,0.04)' }}
        >
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: 'var(--navy-900)' }}>{totalMembers}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Total Anggota</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: '#059669' }}>{totalFilled}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Sudah Isi Log</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold" style={{ color: '#dc2626' }}>{totalMembers - totalFilled}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Belum Isi</p>
          </div>
        </div>
      )}

      {/* Members list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl h-16 animate-pulse" style={{ border: '1px solid var(--cream-border)' }} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group, gi) => (
            <div key={gi}>
              {group.dept && (
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px flex-1" style={{ background: 'var(--cream-border)' }} />
                  <p className="text-xs font-bold uppercase tracking-widest shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {group.dept.name}
                  </p>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--navy-100)', color: 'var(--navy-600)' }}>
                    {group.members.filter((m) => m.log).length}/{group.members.length}
                  </span>
                  <div className="h-px flex-1" style={{ background: 'var(--cream-border)' }} />
                </div>
              )}
              <div className="space-y-2">
                {group.members.map((member) => (
                  <div key={member.id}>
                    <button
                      onClick={() => setExpandedLog(expandedLog === member.id ? null : member.id)}
                      className="w-full text-left bg-white rounded-xl px-4 py-3 transition-all hover:opacity-90"
                      style={{
                        border: `1px solid ${expandedLog === member.id ? 'var(--blue)' : 'var(--cream-border)'}`,
                        boxShadow: expandedLog === member.id ? '0 0 0 3px rgba(0,113,227,0.08)' : '0 1px 4px rgba(11,25,41,0.04)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
                          style={{ background: member.log ? '#d1fae5' : 'var(--gray-100)', color: member.log ? '#065f46' : 'var(--text-muted)' }}
                        >
                          {getInitials(member.full_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                              {member.full_name}
                            </p>
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold uppercase tracking-wide shrink-0"
                              style={member.role === 'dept_head'
                                ? { background: '#ede9fe', color: '#6d28d9' }
                                : { background: 'var(--gray-100)', color: 'var(--text-muted)' }}
                            >
                              {member.role === 'dept_head' ? 'Dept Head' : 'Staf'}
                            </span>
                          </div>
                          {member.log ? (
                            <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--text-muted)' }}>
                              {member.log.content}
                            </p>
                          ) : (
                            <p className="text-xs mt-0.5" style={{ color: '#dc2626' }}>Belum mengisi log</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {member.activityCount > 0 && (
                            <span
                              className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: 'var(--navy-100)', color: 'var(--navy-600)' }}
                            >
                              <BarChart2 size={10} />
                              {member.activityCount}
                            </span>
                          )}
                          {member.log
                            ? <CheckCircle2 size={16} style={{ color: '#059669' }} />
                            : <XCircle size={16} style={{ color: '#dc2626' }} />
                          }
                        </div>
                      </div>
                    </button>

                    {expandedLog === member.id && member.log && (
                      <div
                        className="mx-2 rounded-b-xl px-4 py-3"
                        style={{ background: '#f0fdf4', border: '1px solid #a7f3d0', borderTop: 'none' }}
                      >
                        <p className="text-xs font-bold mb-1.5" style={{ color: '#065f46' }}>Log Harian</p>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: '#065f46' }}>
                          {member.log.content}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {totalMembers === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl" style={{ border: '1px solid var(--cream-border)' }}>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Tidak ada anggota tim yang dapat dipantau.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
