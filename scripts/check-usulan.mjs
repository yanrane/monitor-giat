// Cek validasi usulan disposisi + pengaman redirect login:
// node --experimental-strip-types --no-warnings scripts/check-usulan.mjs
import assert from 'node:assert/strict'
import { parseProposalInput } from '../lib/proposals.ts'
import { safeNextPath } from '../lib/safe-next.ts'

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

assert.equal(safeNextPath('/usulan/abc'), '/usulan/abc')
assert.equal(safeNextPath('/usulan/abc?x=1'), '/usulan/abc?x=1')
for (const evil of ['//evil.com', '/\\evil.com', '/\t/evil.com', '/\n/evil.com', '/\r\\evil.com', 'https://evil.com', 'evil', '', null, undefined]) {
  assert.equal(safeNextPath(evil), null)
}
console.log('check-usulan: OK')
