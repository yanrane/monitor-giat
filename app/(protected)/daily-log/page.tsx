'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type DailyLog } from '@/lib/types'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, ClipboardList, Link2, Loader2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'

function toLocalDateString(date: Date) {
  return date.toLocaleDateString('sv-SE') // YYYY-MM-DD in local timezone
}

function formatDisplayDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

interface ActivityOption { id: string; title: string }

const inputStyle = {
  background: 'var(--gray-100)',
  border: '1px solid var(--gray-300)',
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
} as const

export default function DailyLogPage() {
  const supabase = createClient()
  const [selectedDate, setSelectedDate] = useState(toLocalDateString(new Date()))
  const [entries, setEntries] = useState<DailyLog[]>([])
  const [recentLogs, setRecentLogs] = useState<DailyLog[]>([])
  const [deptActivities, setDeptActivities] = useState<ActivityOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state — dipakai untuk tambah maupun edit satu catatan
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [location, setLocation] = useState('')
  const [activityId, setActivityId] = useState('')

  const today = toLocalDateString(new Date())

  // Dropdown kegiatan: kegiatan aktif departemen sendiri (sekali muat)
  useEffect(() => {
    async function loadActivities() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('dept_id').eq('id', user.id).single()
      if (!prof?.dept_id) return
      const { data: acts } = await supabase
        .from('activities')
        .select('id, title')
        .eq('dept_id', prof.dept_id)
        .neq('status', 'selesai')
        .order('title')
      setDeptActivities((acts as ActivityOption[]) ?? [])
    }
    loadActivities()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadLogs = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: dayLogs }, { data: recent }] = await Promise.all([
      supabase.from('daily_logs').select('*, activities(id, title)')
        .eq('user_id', user.id).eq('log_date', selectedDate).order('created_at'),
      supabase.from('daily_logs').select('*, activities(id, title)')
        .eq('user_id', user.id).order('log_date', { ascending: false }).order('created_at').limit(40),
    ])

    const list = (dayLogs as DailyLog[]) ?? []
    setEntries(list)
    setRecentLogs((recent as DailyLog[]) ?? [])
    setFormOpen(list.length === 0)
    resetForm()
    setLoading(false)
  }, [selectedDate]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadLogs() }, [loadLogs])

  function resetForm() {
    setEditingId(null)
    setContent('')
    setLocation('')
    setActivityId('')
  }

  function startEdit(log: DailyLog) {
    setEditingId(log.id)
    setContent(log.content)
    setLocation(log.location ?? '')
    setActivityId(log.activity_id ?? '')
    setFormOpen(true)
  }

  async function handleSave() {
    if (!content.trim()) { toast.error('Isi catatan tidak boleh kosong'); return }
    if (!location.trim()) { toast.error('Lokasi tidak boleh kosong'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = { content, location: location.trim(), activity_id: activityId || null }
    const { error } = editingId
      ? await supabase.from('daily_logs').update(payload).eq('id', editingId)
      : await supabase.from('daily_logs').insert({ user_id: user.id, log_date: selectedDate, ...payload })

    if (error) {
      toast.error('Gagal menyimpan catatan')
    } else {
      toast.success('Catatan harian tersimpan')
      loadLogs()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Hapus catatan ini?')) return
    const { error } = await supabase.from('daily_logs').delete().eq('id', id)
    if (error) toast.error('Gagal menghapus catatan')
    else { toast.success('Catatan dihapus'); loadLogs() }
  }

  function shiftDate(days: number) {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const next = new Date(y, m - 1, d + days)
    setSelectedDate(toLocalDateString(next))
  }

  const isToday = selectedDate === today
  const isFuture = selectedDate > today

  // Riwayat: grup per tanggal (kini bisa >1 catatan per hari)
  const recentByDate = new Map<string, DailyLog[]>()
  for (const log of recentLogs) {
    if (!recentByDate.has(log.log_date)) recentByDate.set(log.log_date, [])
    recentByDate.get(log.log_date)!.push(log)
  }

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
            Catat pekerjaan Anda per kegiatan — satu catatan untuk tiap kegiatan yang dikerjakan
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

      {isFuture ? (
        <div className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
          <p className="text-sm">Tidak dapat mengisi log untuk tanggal mendatang.</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Catatan hari terpilih */}
          {entries.map((log) => (
            <div
              key={log.id}
              className="bg-white rounded-2xl p-4"
              style={{ border: '1px solid var(--cream-border)', boxShadow: '0 1px 4px rgba(11,25,41,0.04)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg max-w-full"
                  style={log.activities
                    ? { background: 'var(--navy-100)', color: 'var(--navy-700)' }
                    : { background: 'var(--gray-100)', color: 'var(--text-muted)' }}
                >
                  <Link2 size={11} className="shrink-0" />
                  <span className="truncate">{log.activities?.title ?? 'Umum — tidak terkait kegiatan'}</span>
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(log)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100"
                    title="Edit catatan"
                  >
                    <Pencil size={12} style={{ color: 'var(--text-muted)' }} />
                  </button>
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-red-50"
                    title="Hapus catatan"
                  >
                    <Trash2 size={12} style={{ color: '#b3362a' }} />
                  </button>
                </div>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap mt-2" style={{ color: 'var(--text-primary)' }}>
                {log.content}
              </p>
              {log.location && (
                <div className="flex items-center gap-1.5 text-xs font-medium mt-2" style={{ color: 'var(--text-muted)' }}>
                  <MapPin size={12} />
                  {log.location}
                </div>
              )}
            </div>
          ))}

          {/* Form tambah/edit catatan */}
          {formOpen ? (
            <div
              className="bg-white rounded-2xl p-5 space-y-3"
              style={{ border: '1px solid var(--cream-border)', boxShadow: '0 2px 8px rgba(11,25,41,0.06)' }}
            >
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Kegiatan utama terkait
              </label>
              <select
                value={activityId}
                onChange={(e) => setActivityId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
              >
                <option value="">— Umum / tidak terkait kegiatan —</option>
                {deptActivities.map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {editingId ? 'Ubah catatan' : 'Apa yang Anda kerjakan?'}
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Contoh: Menghadiri sidang perkara No. 123/PDT.G/2026, menyiapkan berkas banding, koordinasi dengan tim litigasi..."
                rows={4}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={inputStyle}
              />
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Lokasi
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Contoh: Kantor Pusat Pangkalpinang, PN Jakarta Selatan, WFH..."
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}
              />
              <div className="flex gap-2 pt-1">
                {(entries.length > 0 || editingId) && (
                  <button
                    onClick={() => { resetForm(); setFormOpen(false) }}
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
                  {saving ? 'Menyimpan...' : editingId ? 'Perbarui Catatan' : 'Simpan Catatan'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { resetForm(); setFormOpen(true) }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ border: '1px dashed var(--gray-300)', color: 'var(--blue)', background: 'white' }}
            >
              <Plus size={15} />
              Tambah catatan kegiatan lain
            </button>
          )}
        </div>
      )}

      {/* Riwayat 14 hari (grup per tanggal) */}
      {recentByDate.size > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            Riwayat Terakhir
          </p>
          <div className="space-y-2">
            {[...recentByDate.entries()].slice(0, 14).map(([date, logs]) => (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className="w-full text-left bg-white rounded-xl px-4 py-3 transition-all hover:opacity-80"
                style={{
                  border: `1px solid ${date === selectedDate ? 'var(--blue)' : 'var(--cream-border)'}`,
                  boxShadow: date === selectedDate ? '0 0 0 3px rgba(0,113,227,0.1)' : '0 1px 4px rgba(11,25,41,0.04)',
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                    {formatDisplayDate(date)}
                  </p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'var(--navy-100)', color: 'var(--navy-600)' }}>
                    {logs.length} catatan
                  </span>
                </div>
                {logs.slice(0, 3).map((log) => (
                  <p key={log.id} className="text-sm leading-snug line-clamp-1" style={{ color: 'var(--text-primary)' }}>
                    {log.activities?.title ? <b>{log.activities.title}: </b> : null}{log.content}
                  </p>
                ))}
                {logs.length > 3 && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>+{logs.length - 3} catatan lain</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
