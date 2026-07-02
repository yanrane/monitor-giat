'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type DailyLog } from '@/lib/types'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, ClipboardList, Loader2, Pencil, CheckCircle2, MapPin } from 'lucide-react'

function toLocalDateString(date: Date) {
  return date.toLocaleDateString('sv-SE') // YYYY-MM-DD in local timezone
}

function formatDisplayDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function DailyLogPage() {
  const supabase = createClient()
  const [selectedDate, setSelectedDate] = useState(toLocalDateString(new Date()))
  const [content, setContent] = useState('')
  const [location, setLocation] = useState('')
  const [existingLog, setExistingLog] = useState<DailyLog | null>(null)
  const [recentLogs, setRecentLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)

  const today = toLocalDateString(new Date())

  const loadLogs = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: log }, { data: recent }] = await Promise.all([
      supabase.from('daily_logs').select('*').eq('user_id', user.id).eq('log_date', selectedDate).maybeSingle(),
      supabase.from('daily_logs').select('*').eq('user_id', user.id).order('log_date', { ascending: false }).limit(14),
    ])

    setExistingLog(log as DailyLog | null)
    setContent(log?.content ?? '')
    setLocation(log?.location ?? '')
    setEditing(!log)
    setRecentLogs(recent as DailyLog[] ?? [])
    setLoading(false)
  }, [selectedDate]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadLogs() }, [loadLogs])

  async function handleSave() {
    if (!content.trim()) { toast.error('Isi log tidak boleh kosong'); return }
    if (!location.trim()) { toast.error('Lokasi tidak boleh kosong'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = { content, location: location.trim() }
    const { error } = existingLog
      ? await supabase.from('daily_logs').update(payload).eq('id', existingLog.id)
      : await supabase.from('daily_logs').insert({ user_id: user.id, log_date: selectedDate, ...payload })

    if (error) {
      toast.error('Gagal menyimpan log')
    } else {
      toast.success('Log harian tersimpan')
      loadLogs()
    }
    setSaving(false)
  }

  function shiftDate(days: number) {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const next = new Date(y, m - 1, d + days)
    setSelectedDate(toLocalDateString(next))
  }

  const isToday = selectedDate === today
  const isFuture = selectedDate > today

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--navy-900)' }}>
          <ClipboardList size={18} className="text-white" />
        </div>
        <div>
          <h1 className="font-serif leading-tight" style={{ fontSize: '26px', color: 'var(--navy-900)' }}>
            Log Harian
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Catat aktivitas kerja Anda setiap hari
          </p>
        </div>
      </div>

      {/* Date navigator */}
      <div
        className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3"
        style={{ border: '1px solid var(--cream-border)', boxShadow: '0 1px 4px rgba(11,25,41,0.04)' }}
      >
        <button
          onClick={() => shiftDate(-1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100"
        >
          <ChevronLeft size={16} style={{ color: 'var(--text-muted)' }} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {isToday ? 'Hari ini — ' : ''}{formatDisplayDate(selectedDate)}
          </p>
        </div>
        <button
          onClick={() => shiftDate(1)}
          disabled={isToday}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Log form */}
      {!isFuture && (
        <div
          className="bg-white rounded-2xl p-5"
          style={{ border: '1px solid var(--cream-border)', boxShadow: '0 2px 8px rgba(11,25,41,0.06)' }}
        >
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
            </div>
          ) : !editing && existingLog ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: '#059669' }}>
                  <CheckCircle2 size={14} />
                  Log sudah diisi
                </div>
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--cream-border)' }}
                >
                  <Pencil size={11} /> Edit
                </button>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                {existingLog.content}
              </p>
              {existingLog.location && (
                <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  <MapPin size={12} />
                  {existingLog.location}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {isToday ? 'Apa yang Anda kerjakan hari ini?' : 'Isi log untuk tanggal ini'}
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Contoh: Menghadiri sidang perkara No. 123/PDT.G/2026, menyiapkan berkas banding, koordinasi dengan tim litigasi..."
                rows={5}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all resize-none"
                style={{
                  background: 'var(--gray-100)',
                  border: '1px solid var(--gray-300)',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                }}
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
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Lokasi
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Contoh: Kantor Pusat Pangkalpinang, PN Jakarta Selatan, WFH..."
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: 'var(--gray-100)',
                  border: '1px solid var(--gray-300)',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                }}
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
              <div className="flex gap-2">
                {existingLog && (
                  <button
                    onClick={() => { setEditing(false); setContent(existingLog.content); setLocation(existingLog.location ?? '') }}
                    className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{ border: '1px solid var(--gray-300)', color: 'var(--text-secondary)', background: 'var(--gray-100)' }}
                  >
                    Batal
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{
                    background: saving ? 'var(--blue-dark)' : 'var(--blue)',
                    boxShadow: saving ? 'none' : '0 2px 8px rgba(0,113,227,0.3)',
                  }}
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saving ? 'Menyimpan...' : existingLog ? 'Perbarui Log' : 'Simpan Log'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isFuture && (
        <div className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
          <p className="text-sm">Tidak dapat mengisi log untuk tanggal mendatang.</p>
        </div>
      )}

      {/* Recent logs */}
      {recentLogs.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            14 Hari Terakhir
          </p>
          <div className="space-y-2">
            {recentLogs.map((log) => (
              <button
                key={log.id}
                onClick={() => setSelectedDate(log.log_date)}
                className="w-full text-left bg-white rounded-xl px-4 py-3 transition-all hover:opacity-80"
                style={{
                  border: `1px solid ${log.log_date === selectedDate ? 'var(--blue)' : 'var(--cream-border)'}`,
                  boxShadow: log.log_date === selectedDate ? '0 0 0 3px rgba(0,113,227,0.1)' : '0 1px 4px rgba(11,25,41,0.04)',
                }}
              >
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                  {formatDisplayDate(log.log_date)}
                </p>
                <p className="text-sm leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                  {log.content}
                </p>
                {log.location && (
                  <p className="flex items-center gap-1 text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    <MapPin size={11} className="shrink-0" />
                    {log.location}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
