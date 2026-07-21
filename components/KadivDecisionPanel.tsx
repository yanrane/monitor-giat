'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, Compass, CornerUpLeft, Gavel, HelpCircle, Loader2 } from 'lucide-react'
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

  function selectAction(a: DecisionAction) {
    setAction(a)
    setStatus(DECISION_DEFAULT_STATUS[a])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!instruction.trim()) {
      toast.error('Instruksi/keputusan wajib diisi')
      return
    }
    setSubmitting(true)
    const result = await applyKadivDecision(activity.id, {
      action,
      instruction,
      resulting_control_status: status,
      next_action: nextAction || null,
      next_action_due_date: dueDate || null,
    })
    setSubmitting(false)
    if (result?.error) {
      toast.error(`Gagal menyimpan keputusan: ${result.error}`)
    } else {
      toast.success('Keputusan tersimpan')
      router.refresh()
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid #e0d3f5', boxShadow: '0 1px 4px rgba(11,25,41,0.05)' }}
    >
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--separator)', background: '#f9f5fd' }}>
        <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: '#f3ebfb' }}>
          <Gavel size={13} style={{ color: '#6d4fc4' }} />
        </span>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Keputusan Kadiv
        </span>
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 bg-white">
        {activity.decision_needed && (
          <div className="rounded-xl p-3.5" style={{ background: 'var(--warn-bg)', borderLeft: '3px solid var(--warn)' }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--warn)' }}>
              Keputusan yang diminta
            </p>
            <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {activity.decision_needed}
            </p>
          </div>
        )}

        {/* Pilihan aksi */}
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

        {/* Instruksi (wajib) */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Instruksi / keputusan <span style={{ color: 'var(--bad)' }}>*</span>
          </label>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            required
            rows={3}
            placeholder="Tuliskan keputusan atau arahan untuk PIC…"
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-200"
            style={inputStyle}
          />
        </div>

        {/* Status kendali hasil */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Status kendali setelah keputusan
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
              Target next action (opsional)
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

        {/* Next action (opsional) */}
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Next action untuk PIC (opsional)
          </label>
          <input
            type="text"
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            placeholder="Kosongkan jika next action tidak berubah"
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-200"
            style={inputStyle}
          />
        </div>

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
