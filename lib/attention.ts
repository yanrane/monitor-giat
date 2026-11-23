// "Butuh Anda hari ini" — daftar pengecualian untuk Kadiv.
// Satu sumber untuk dashboard dan briefing bot, supaya isinya selalu sama.
// Sengaja tanpa import runtime agar bisa diuji langsung dengan node (scripts/check-attention.mjs).

export type AttentionReason = 'keputusan' | 'lewat_tenggat' | 'tenggat_dekat' | 'tanpa_update'

export const ATTENTION_LABELS: Record<AttentionReason, string> = {
  keputusan: 'Butuh keputusan',
  lewat_tenggat: 'Lewat tenggat',
  tenggat_dekat: 'P1 tenggat dekat',
  tanpa_update: 'Tanpa update',
}

export const IDLE_CRITICAL_DAYS = 14 // sama dengan staleLevel 'critical'
export const P1_SOON_DAYS = 3

export interface AttentionInput {
  status: string
  priority: string | null
  control_status: string | null
  decision_needed?: string | null
  next_action_due_date: string | null
  last_substantive_update_at: string | null
  updated_at: string
}

export interface AttentionEntry<T> {
  activity: T
  reasons: AttentionReason[]
  overdueDays: number
  idleDays: number
}

const RANK: Record<AttentionReason, number> = { keputusan: 0, lewat_tenggat: 1, tenggat_dekat: 2, tanpa_update: 3 }

const wib = (d: string) => new Date(d).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000)

export function buildAttention<T extends AttentionInput>(activities: T[], today: string, limit = 7) {
  const all: AttentionEntry<T>[] = []

  for (const a of activities) {
    if (a.status === 'selesai' || a.status === 'ditunda') continue

    const reasons: AttentionReason[] = []
    if (a.decision_needed || a.control_status === 'needs_kadiv_decision' || a.control_status === 'escalated') {
      reasons.push('keputusan')
    }
    const due = a.next_action_due_date
    const overdueDays = due && due < today ? daysBetween(due, today) : 0
    if (overdueDays > 0) reasons.push('lewat_tenggat')
    else if (due && a.priority === 'p1' && daysBetween(today, due) <= P1_SOON_DAYS) reasons.push('tenggat_dekat')

    const idleDays = daysBetween(wib(a.last_substantive_update_at ?? a.updated_at), today)
    if (idleDays >= IDLE_CRITICAL_DAYS) reasons.push('tanpa_update')

    if (reasons.length > 0) all.push({ activity: a, reasons, overdueDays, idleDays })
  }

  // Alasan terberat dulu, lalu P1, lalu paling lama terlambat / diam
  all.sort((x, y) =>
    RANK[x.reasons[0]] - RANK[y.reasons[0]] ||
    (x.activity.priority ?? 'p9').localeCompare(y.activity.priority ?? 'p9') ||
    y.overdueDays - x.overdueDays ||
    y.idleDays - x.idleDays
  )

  const counts = { keputusan: 0, lewat_tenggat: 0, tenggat_dekat: 0, tanpa_update: 0 } as Record<AttentionReason, number>
  for (const e of all) for (const r of e.reasons) counts[r] += 1

  return { items: all.slice(0, limit), total: all.length, counts }
}

// Bagian "Butuh Kadiv hari ini" di ringkasan teks bot (/api/bot/summary?format=text)
export interface KadivBriefing {
  total: number
  usulan_menunggu: number
  daftar: Array<{
    judul: string
    bidang: string
    pic: string | null
    alasan: AttentionReason[]
    prioritas: string | null
    langkah_berikutnya: string | null
    tenggat_langkah: string | null
    hari_lewat_tenggat: number
    hari_tanpa_update: number
  }>
}

export function kadivBriefingLines(k: KadivBriefing): string[] {
  const L = [`*Butuh Kadiv hari ini* (${k.daftar.length} dari ${k.total})`]
  if (k.usulan_menunggu > 0) L.push(`- Usulan target menunggu Kadiv: ${k.usulan_menunggu}`)
  if (k.total === 0 && k.usulan_menunggu === 0) L.push('- Tidak ada ✅')
  k.daftar.forEach((e, i) => {
    const tag = e.alasan
      .map((r) =>
        r === 'lewat_tenggat' ? `lewat tenggat ${e.hari_lewat_tenggat} hari`
        : r === 'tanpa_update' ? `${e.hari_tanpa_update} hari tanpa update`
        : ATTENTION_LABELS[r].toLowerCase()
      )
      .concat(e.prioritas === 'p1' ? ['P1'] : [])
      .join(', ')
    L.push(`${i + 1}. ${e.judul} (${e.bidang}${e.pic ? `, PIC: ${e.pic}` : ''}) — ${tag}`)
    if (e.langkah_berikutnya) {
      L.push(`   → ${e.langkah_berikutnya}${e.tenggat_langkah ? ` (tenggat ${e.tenggat_langkah})` : ''}`)
    }
  })
  return L
}
