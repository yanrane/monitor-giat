'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, ChevronDown, Compass, CornerUpLeft, Gavel, HelpCircle, Loader2 } from 'lucide-react'
import {
  type Activity,
  type ControlStatus,
  type DecisionAction,
  CONTROL_STATUS_LABELS,
  DECISION_ACTION_LABELS,
  DECISION_DEFAULT_STATUS,
  DECISION_RESULT_STATUSES,
} from '@/lib/types'
import { applyKadivDecision } from '@/app/(protected)/activities/[id]/decision-actions'

const ACTION_ICONS: Record<DecisionAction, typeof CheckCircle2> = {
  approve_continue: CheckCircle2,
  beri_arahan: Compass,
  minta_klarifikasi: HelpCircle,
  eskalasi_kembalikan: CornerUpLeft,
}

// Penjelasan singkat tiap pilihan — tampil di bawah tombol yang dipilih
const ACTION_HELP: Record<DecisionAction, string> = {
  approve_continue: 'PIC melanjutkan pekerjaan sesuai rencana. Catatan boleh dikosongkan.',
  beri_arahan: 'Tuliskan arahan yang harus dijalankan PIC.',
  minta_klarifikasi: 'Tuliskan hal yang perlu dijelaskan PIC sebelum Anda memutuskan.',
  eskalasi_kembalikan: 'Tuliskan apa yang harus diperbaiki atau dilengkapi PIC.',
}

const ACTION_PLACEHOLDER: Record<DecisionAction, string> = {
  approve_continue: 'Catatan tambahan (boleh dikosongkan)…',
  beri_arahan: 'Contoh: Koordinasikan dulu dengan Kadiv Procurement sebelum somasi dikirim…',
  minta_klarifikasi: 'Contoh: Jelaskan dasar hukum yang dipakai untuk langkah ini…',
  eskalasi_kembalikan: 'Contoh: Lengkapi kronologi dan bukti pendukung, lalu ajukan kembali…',
}

// Isi otomatis kalau Kadiv menyetujui tanpa menulis catatan
const APPROVE_DEFAULT_TEXT = 'Disetujui. Lanjutkan sesuai rencana.'

const ACTIONS = Object.keys(DECISION_ACTION_LABELS) as DecisionAction[]

const inputStyle = {
  border: '1px solid var(--cream-border)',
  background: 'white',
  color: 'var(--text-primary)',
} as const

export function KadivDecisionPanel({ activity }: { activity: Activity }) {
  const router = useRouter()
  const [action, setAction]           = useState<DecisionAction>('approve_continue')
  const [instruction, setInstruction] = useState('')
  const [status, setStatus]           = useState<ControlStatus>(DECISION_DEFAULT_STATUS.approve_continue)
  const [nextAction, setNextAction]   = useState('')
  const [dueDate, setDueDate]         = useState('')
  const [submitting, setSubmitting]   = useState(false)

  const isApprove = action === 'approve_continue'

  function selectAction(a: DecisionAction) {
    setAction(a)
    setStatus(DECISION_DEFAULT_STATUS[a])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const finalInstruction = instruction.trim() || (isApprove ? APPROVE_DEFAULT_TEXT : '')
    if (!finalInstruction) {
      toast.error('Tuliskan dulu catatan untuk PIC')
      return
    }
    setSubmitting(true)
    const result = await applyKadivDecision(activity.id, {
      action,
      instruction: finalInstruction,
      resulting_control_status: status,
      next_action: nextAction || null,
      next_action_due_date: dueDate || null,
    })
    setSubmitting(false)
    if (result?.error) {
      toast.error(`Gagal menyimpan keputusan: ${result.error}`)
    } else {
      toast.success('Keputusan tersimpan — PIC dapat melihatnya di halaman ini')
      router.refresh()
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid #e0d3f5', boxShadow: '0 1px 4px rgba(11,25,41,0.05)' }}
    >
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--separator)', background: '#f9f5fd' }}>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: '#f3ebfb' }}>
            <Gavel size={13} style={{ color: '#6d4fc4' }} />
          </span>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Keputusan Kadiv
          </span>
        </div>
        <p className="text-xs mt-1 ml-8" style={{ color: 'var(--text-muted)' }}>
          Pilih tanggapan Anda, lalu simpan — PIC akan menerima keputusan ini.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 bg-white">
        {activity.decision_needed && (
          <div className="rounded-xl p-3.5" style={{ background: 'var(--warn-bg)', borderLeft: '3px solid var(--warn)' }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--warn)' }}>
              Yang diminta PIC
            </p>
            <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {activity.decision_needed}
            </p>
          </div>
        )}

        {/* Langkah 1: pilih tanggapan */}
        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
            1. Tanggapan Anda
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ACTIONS.map((a) => {
              const Icon = ACTION_ICONS[a]
              const active = action === a
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => selectAction(a)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition-all"
                  style={{
                    border: active ? '1px solid #6d4fc4' : '1px solid var(--cream-border)',
                    background: active ? '#f3ebfb' : 'white',
                    color: active ? '#6d4fc4' : 'var(--text-secondary)',
                  }}
                >
                  <Icon size={15} className="shrink-0" />
                  {DECISION_ACTION_LABELS[a]}
                </button>
              )
            })}
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            {ACTION_HELP[action]}
          </p>
        </div>

        {/* Langkah 2: catatan untuk PIC */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
            2. Catatan untuk PIC {!isApprove && <span style={{ color: 'var(--bad)' }}>*</span>}
          </label>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            required={!isApprove}
            rows={3}
            placeholder={ACTION_PLACEHOLDER[action]}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-200"
            style={inputStyle}
          />
        </div>

        {/* Info hasil + pengaturan lanjutan (terlipat) */}
        <details className="rounded-xl" style={{ border: '1px solid var(--cream-border)', background: 'var(--surface-2, #fafafa)' }}>
          <summary className="flex items-center gap-2 px-3.5 py-2.5 text-xs cursor-pointer select-none" style={{ color: 'var(--text-secondary)' }}>
            <ChevronDown size={13} className="shrink-0" />
            <span>
              Setelah disimpan, status kendali menjadi{' '}
              <b style={{ color: 'var(--text-primary)' }}>{CONTROL_STATUS_LABELS[status]}</b>
              {' '}— klik untuk mengubah / mengatur tindak lanjut
            </span>
          </summary>
          <div className="px-3.5 pb-3.5 pt-1 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Status kendali kegiatan
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ControlStatus)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-200"
                  style={inputStyle}
                >
                  {DECISION_RESULT_STATUSES.map((s) => (
                    <option key={s} value={s}>{CONTROL_STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Tenggat tindak lanjut (opsional)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-200"
                  style={inputStyle}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Tindak lanjut berikutnya untuk PIC (opsional)
              </label>
              <input
                type="text"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="Kosongkan jika tidak berubah"
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-200"
                style={inputStyle}
              />
            </div>
          </div>
        </details>

        <button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
          style={{ background: '#6d4fc4' }}
        >
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <Gavel size={15} />}
          Simpan Keputusan
        </button>
      </form>
    </div>
  )
}
