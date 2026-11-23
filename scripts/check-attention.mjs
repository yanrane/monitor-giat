// Cek cepat logika "Butuh Anda hari ini": node --experimental-strip-types scripts/check-attention.mjs
import assert from 'node:assert/strict'
import { buildAttention, kadivBriefingLines } from '../lib/attention.ts'

const today = '2026-11-23'
const fresh = '2026-11-22T03:00:00Z'
const base = { status: 'berjalan', priority: 'p2', control_status: 'on_track', decision_needed: null, next_action_due_date: null, last_substantive_update_at: fresh, updated_at: fresh }
const act = (id, over) => ({ id, ...base, ...over })

const r = buildAttention([
  act('ok'),
  act('selesai', { status: 'selesai', control_status: 'needs_kadiv_decision' }),
  act('ditunda', { status: 'ditunda', next_action_due_date: '2026-10-01' }),
  act('diam', { last_substantive_update_at: '2026-11-01T03:00:00Z' }),
  act('lewat', { next_action_due_date: '2026-11-20' }),
  act('lewat-lama', { next_action_due_date: '2026-11-01' }),
  act('p1-dekat', { priority: 'p1', next_action_due_date: '2026-11-25' }),
  act('p2-dekat', { next_action_due_date: '2026-11-25' }),
  act('putus-p2', { decision_needed: 'Setujui mediasi?' }),
  act('putus-p1', { priority: 'p1', control_status: 'escalated', next_action_due_date: '2026-11-10' }),
], today, 5)

assert.deepEqual(r.items.map((e) => e.activity.id), ['putus-p1', 'putus-p2', 'lewat-lama', 'lewat', 'p1-dekat'])
assert.equal(r.total, 6) // 'diam' terpotong limit; ok/selesai/ditunda/p2-dekat tidak masuk
assert.deepEqual(r.items[0].reasons, ['keputusan', 'lewat_tenggat'])
assert.equal(r.items[2].overdueDays, 22)
assert.deepEqual(r.counts, { keputusan: 2, lewat_tenggat: 3, tenggat_dekat: 1, tanpa_update: 1 })

// Teks briefing Kadiv (ringkasan bot): "Tidak ada" hanya bila kegiatan DAN usulan kosong
const onlyProposals = kadivBriefingLines({ total: 0, usulan_menunggu: 2, daftar: [] })
assert.ok(onlyProposals.includes('- Usulan target menunggu Kadiv: 2'))
assert.ok(!onlyProposals.includes('- Tidak ada ✅'))
assert.ok(kadivBriefingLines({ total: 0, usulan_menunggu: 0, daftar: [] }).includes('- Tidak ada ✅'))
const one = kadivBriefingLines({
  total: 1, usulan_menunggu: 0,
  daftar: [{ judul: 'X', bidang: 'Litigasi', pic: 'Y', alasan: ['lewat_tenggat'], prioritas: 'p1',
    langkah_berikutnya: 'Kirim draft', tenggat_langkah: '2026-11-20', hari_lewat_tenggat: 3, hari_tanpa_update: 2 }],
})
assert.deepEqual(one.slice(1, 3), ['1. X (Litigasi, PIC: Y) — lewat tenggat 3 hari, P1', '   → Kirim draft (tenggat 2026-11-20)'])
console.log('check-attention: OK')
