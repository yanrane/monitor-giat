// Cek validasi usulan disposisi + pengaman redirect login:
// node --experimental-strip-types --no-warnings scripts/check-usulan.mjs
import assert from 'node:assert/strict'
import { parseProposalInput, parseTeoRef, isIsoDate } from '../lib/proposals.ts'
import { safeNextPath } from '../lib/safe-next.ts'
import { formatDateTime } from '../lib/utils.ts'

const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222'
const ctx = { today: '2026-11-23', activePicIds: new Set([A, B]) }
const ok = { teo_ref: ' ND-123/2026 ', perihal: 'Review kontrak', judul: 'Review draft PKS', pic_ids: [A, A, B], target_date: '2026-11-26' }

const r = parseProposalInput(ok, ctx)
assert.equal(r.ok, true)
assert.equal(r.value.teo_ref, 'ND-123/2026')
assert.deepEqual(r.value.pic_ids, [A, B])
assert.equal(r.value.instruksi, null)

const bad = (over) => parseProposalInput({ ...ok, ...over }, ctx).ok
assert.equal(bad({ teo_ref: '' }), false)
assert.equal(bad({ perihal: 'x'.repeat(301) }), false)
assert.equal(bad({ instruksi: 'x'.repeat(1001) }), false)
assert.equal(bad({ judul: 'x'.repeat(201) }), false)
assert.equal(bad({ pic_ids: [] }), false)
assert.equal(bad({ pic_ids: ['33333333-3333-4333-8333-333333333333'] }), false) // bukan profil aktif
assert.equal(bad({ target_date: '2026-11-22' }), false) // kemarin
assert.equal(bad({ target_date: '2026-11-23' }), true)  // hari ini boleh
assert.equal(bad({ target_date: '2027-11-24' }), false) // > 365 hari
assert.equal(bad({ target_date: '23-11-2026' }), false)
assert.equal(bad({ target_date: '2026-13-01' }), false) // bulan mustahil: ditolak, bukan crash
assert.equal(bad({ teo_tanggal: '2026-02-30' }), false)
assert.equal(parseProposalInput(null, ctx).ok, false)

// Idempoten: teo_ref dibaca lebih dulu dan terpisah dari validasi penuh, supaya kiriman ulang
// usulan lama (tenggat sudah lewat / PIC sudah nonaktif) tetap dijawab 200, bukan 400
assert.equal(parseTeoRef({ ...ok, target_date: '2020-01-01', pic_ids: [] }), 'ND-123/2026')
assert.equal(parseTeoRef({ teo_ref: '  ' }), null)
assert.equal(parseTeoRef({ teo_ref: 'x'.repeat(101) }), null)
assert.equal(parseTeoRef({ teo_ref: 123 }), null)
assert.equal(parseTeoRef(null), null)

// teo_ref dinormalisasi (huruf besar, spasi dirapikan) supaya varian penulisan tidak jadi usulan ganda
assert.equal(parseTeoRef({ teo_ref: ' nd  123/2026 ' }), 'ND 123/2026')
assert.equal(parseProposalInput({ ...ok, teo_ref: 'nd-123/2026' }, ctx).value.teo_ref, 'ND-123/2026')

// Input yang lolos validasi harus juga lolos Postgres (400, bukan 500)
assert.equal(bad({ judul: 'a\u0000b' }), false)                // NUL ditolak
assert.equal(bad({ teo_ref: 'ND\u0000' }), false)
assert.equal(bad({ teo_tanggal: '0000-01-01' }), false)         // tahun 0 tidak ada di Postgres
assert.equal(bad({ teo_tanggal: '1899-12-31' }), false)
const emptyTgl = parseProposalInput({ ...ok, teo_tanggal: '' }, ctx)
assert.equal(emptyTgl.ok, true)                                 // "" = kosong, seperti field opsional lain
assert.equal(emptyTgl.value.teo_tanggal, null)

// Parameter tanggal di URL bot divalidasi sungguhan
assert.equal(isIsoDate('2026-11-24'), true)
assert.equal(isIsoDate('2026-13-45'), false)
assert.equal(isIsoDate('2026-11-24T00:00'), false)

// Jam selalu WIB walau server berjalan di UTC (Vercel)
assert.equal(formatDateTime('2026-11-23T22:05:00Z'), '24 Nov 2026, 05.05')

assert.equal(safeNextPath('/usulan/abc'), '/usulan/abc')
assert.equal(safeNextPath('/usulan/abc?x=1'), '/usulan/abc?x=1')
for (const evil of ['//evil.com', '/\\evil.com', '/\t/evil.com', '/\n/evil.com', '/\r\\evil.com', '/.//evil.com', '/a/..//evil.com', '/%2e//evil.com', 'https://evil.com', 'evil', '', null, undefined]) {
  assert.equal(safeNextPath(evil), null)
}
console.log('check-usulan: OK')
