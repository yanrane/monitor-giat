# Usulan Target dari Disposisi TEO — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agent (KEVIN) mengirim usulan item Monitor Progress dari disposisi TEO; Kadiv menyetujui di `/usulan/[id]`; item terbentuk per PIC dan data keterlambatan tersedia untuk teguran WA KEVIN.

**Architecture:** Tabel baru `progress_proposals` (pendekatan A). Bot hanya bisa membuat usulan lewat `POST /api/bot/proposals` (izin `can_propose`); item `progress_items` baru dibuat oleh server action Kadiv saat menyetujui. Validasi payload dan pengaman redirect login berupa fungsi murni yang dicek dengan skrip node.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + RLS + service_role), Tailwind v4, zod 4, Node 22 (`--experimental-strip-types` untuk skrip cek).

**Spec:** `docs/superpowers/specs/2026-11-23-usulan-disposisi-teo-design.md`

## Global Constraints

- Baca panduan relevan di `node_modules/next/dist/docs/` sebelum memakai API Next yang belum dipakai repo (AGENTS.md). `params`/`searchParams` halaman adalah `Promise`.
- Tailwind v4: variabel CSS ditulis `bg-(--surface-2)`, `divide-(--separator)` — bukan `[--x]`.
- Tanggal "hari ini" selalu WIB: `wibDateStr()` dari `lib/utils.ts`.
- Batas field (spec §6.1): `teo_ref` ≤ 100, `perihal` ≤ 300 (wajib), `instruksi` ≤ 1000, `judul` ≤ 200 (wajib), `alasan_tenggat` ≤ 300, `pic_ids` ≥ 1 profil aktif non-Kadiv, `target_date` dari hari ini s.d. +365 hari.
- Status usulan persis: `menunggu`, `disetujui`, `ditolak`.
- Payload bot tidak pernah memuat nomor telepon atau isi/lampiran surat.
- Field lama `/api/bot/summary` tidak boleh berubah bentuk (dipakai KEVIN dan bot Grok).
- Migration **018** dijalankan Boss di SQL Editor Supabase **sebelum** deploy kode (Task 2 memperluas `select` `bot_tokens`; tanpa kolom `can_propose`, semua bot gagal autentikasi).
- Dev server lokal memakai database **production**. Uji yang menulis data hanya di Task 7, dengan persetujuan Boss.
- `git pull --rebase` sebelum push (repo dibagi dengan Kevin); deploy manual `vercel --prod`.

## Review Focus

1. **Deploy mendahului migration** → `authorizeBotToken` error untuk semua bot. Harapan: urutan migration → probe kolom → deploy (Task 1 Step 3, Task 7 Step 6).
2. **Setujui diklik dua kali / dua tab** → item dobel. Harapan: hanya klik pertama membuat item; klik kedua mendapat "Usulan sudah diputus" (Task 4 Step 4, diuji Task 7 Step 3).
3. **Dua agent mengirim `teo_ref` yang sama dengan isi berbeda** → isi pertama dipertahankan, respons 200 berisi usulan lama (Task 3 Step 3, diuji Task 7 Step 2).
4. **PIC atau pengguna non-Kadiv membuka link usulan** → tidak melihat isi usulan (RLS + cek peran; Task 4 Step 3, diuji Task 7 Step 4).
5. **`next` berbahaya di login** (`//evil.com`, `/\evil.com`, `https://evil.com`) → diabaikan, jatuh ke tujuan default (Task 5, skrip cek).

---

### Task 1: Migration 018 dan tipe

**Files:**
- Create: `supabase/migrations/018_progress_proposals.sql`
- Modify: `lib/types.ts` (tambah `ProposalStatus`, `ProgressProposal`, `ProgressItem.proposal_id`)

**Interfaces:**
- Produces: tabel `progress_proposals` (kolom persis spec §6.1), `progress_items.proposal_id`, `bot_tokens.can_propose`; tipe TS:
  `type ProposalStatus = 'menunggu' | 'disetujui' | 'ditolak'`;
  `interface ProgressProposal { id; teo_ref; teo_tanggal: string | null; perihal; instruksi: string | null; judul; pic_ids: string[]; target_date; alasan_tenggat: string | null; status: ProposalStatus; proposed_by_token: string | null; decided_by: string | null; decided_at: string | null; alasan_tolak: string | null; created_at }`.

- [ ] **Step 1: Tulis migration.** Ketentuan yang tidak boleh berubah:
  - `teo_ref text NOT NULL UNIQUE`, `status text NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu','disetujui','ditolak'))`, `pic_ids uuid[] NOT NULL CHECK (cardinality(pic_ids) >= 1)`, CHECK panjang sesuai Global Constraints.
  - `ALTER TABLE progress_items ADD COLUMN proposal_id uuid REFERENCES progress_proposals(id) ON DELETE SET NULL;`
  - `ALTER TABLE bot_tokens ADD COLUMN can_propose boolean NOT NULL DEFAULT false;`
  - RLS aktif; policy `SELECT` dan `UPDATE` `USING (get_my_role() = 'kadiv')`; **tanpa** policy INSERT/DELETE (insert hanya service_role via API bot).
  - Index `(status, created_at)`.
- [ ] **Step 2: Tambah tipe** di `lib/types.ts`; `npx tsc --noEmit` → tanpa error.
- [ ] **Step 3: Boss menjalankan SQL**, lalu verifikasi:
  - probe REST (anon key) `GET /rest/v1/progress_proposals?select=id&limit=1` → `[]` (RLS), **bukan** `42P01`;
  - di SQL Editor: `select can_propose from bot_tokens limit 1;` dan `select proposal_id from progress_items limit 1;` → tanpa error (`bot_tokens` tertutup untuk anon, jadi tidak bisa diprobe lewat REST).
- [ ] **Step 4: Commit** `feat(db): migration 018 progress_proposals + can_propose`.

### Task 2: Validasi usulan dan pengaman redirect (fungsi murni)

**Files:**
- Create: `lib/proposals.ts`, `lib/safe-next.ts`, `scripts/check-usulan.mjs`

**Interfaces:**
- Produces:
  - `parseProposalInput(body: unknown, ctx: { today: string; activePicIds: Set<string> }): { ok: true; value: ProposalInput } | { ok: false; errors: string[] }`
  - `interface ProposalInput { teo_ref: string; teo_tanggal: string | null; perihal: string; instruksi: string | null; judul: string; pic_ids: string[]; target_date: string; alasan_tenggat: string | null }` (string di-trim; `pic_ids` di-dedupe).
  - `safeNextPath(next: string | null | undefined): string | null`
- Kedua modul hanya mengimpor `zod` (bukan `@/…`) agar bisa dijalankan node langsung.

- [ ] **Step 1: Tulis skrip cek (gagal dulu).**

```js
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
assert.equal(parseProposalInput(null, ctx).ok, false)

assert.equal(safeNextPath('/usulan/abc'), '/usulan/abc')
assert.equal(safeNextPath('/usulan/abc?x=1'), '/usulan/abc?x=1')
for (const evil of ['//evil.com', '/\\evil.com', 'https://evil.com', 'evil', '', null, undefined]) {
  assert.equal(safeNextPath(evil), null)
}
console.log('check-usulan: OK')
```

- [ ] **Step 2: Jalankan** `node --experimental-strip-types --no-warnings scripts/check-usulan.mjs` → gagal (modul belum ada).
- [ ] **Step 3: Implement** kedua modul. `parseProposalInput` memakai skema zod untuk bentuk + batas panjang + format `YYYY-MM-DD`, lalu cek tanggal (string compare terhadap `ctx.today` dan `today + 365 hari`) dan keanggotaan `activePicIds`; pesan error berbahasa Indonesia menyebut field-nya.
- [ ] **Step 4: Jalankan skrip** → `check-usulan: OK`; `npx tsc --noEmit` bersih.
- [ ] **Step 5: Commit** `feat: validasi usulan disposisi + safeNextPath`.

### Task 3: API bot — people dan proposals

**Files:**
- Modify: `lib/bot-access.ts` (`BotTokenRow.can_propose: boolean`; tambahkan `can_propose` ke `select` di `authorizeBotToken`)
- Create: `app/api/bot/people/route.ts`, `app/api/bot/proposals/route.ts`

**Interfaces:**
- Consumes: `authorizeBotToken`, `recordBotAccess` (lib/bot-access.ts); `parseProposalInput` (Task 2); `createAdminClient()`; `wibDateStr()`.
- Produces (kontrak KEVIN, spec §6.2):
  - `GET /api/bot/people` → `200 [{ id, nama, bidang }]` profil `is_active` dan `role <> 'kadiv'`.
  - `POST /api/bot/proposals` → `403` bila `!token.can_propose`; `400 { errors }` bila validasi gagal; `201 { id, status, url }` usulan baru; `200 { id, status, url }` bila `teo_ref` sudah ada (tanpa mengubah baris lama). `url = ${origin}/usulan/${id}` dengan `origin = new URL(request.url).origin`.
  - `GET /api/bot/proposals?status=&sejak=YYYY-MM-DD` → `200 [{ id, teo_ref, status, judul, pic: string[], target_date, decided_at, alasan_tolak, url }]`, urut `created_at` desc, maks 100.

- [ ] **Step 1: Perluas `BotTokenRow`/`select`**; `npx tsc --noEmit` bersih.
- [ ] **Step 2: `GET /api/bot/people`** mengikuti pola `app/api/bot/summary/route.ts` (auth → query admin → `recordBotAccess` → JSON, `export const dynamic = 'force-dynamic'`).
- [ ] **Step 3: `POST /api/bot/proposals`.** Urutan: auth → cek `can_propose` → parse JSON (gagal → 400) → ambil id profil aktif → `parseProposalInput(body, { today: wibDateStr(), activePicIds })` → cari `teo_ref` yang sudah ada (ada → 200 baris lama) → insert dengan `proposed_by_token = token.id` → bila insert gagal karena unique violation (`23505`, balapan dua agent) baca ulang dan kembalikan 200 → 201. Catat `recordBotAccess` di setiap cabang (ok=false untuk 4xx/5xx).
- [ ] **Step 4: `GET /api/bot/proposals`** (izin baca biasa): filter opsional `status` (salah satu dari tiga nilai, selain itu 400) dan `sejak` (`created_at >= sejak` WIB); nama PIC diselesaikan dari `profiles`.
- [ ] **Step 5: Verifikasi tanpa menulis data:** `npm run dev`, lalu
  `curl -s -o /dev/null -w "%{http_code}" localhost:3000/api/bot/people` → `401`;
  `curl -s -o /dev/null -w "%{http_code}" -X POST localhost:3000/api/bot/proposals` → `401`. `npx tsc --noEmit` bersih.
- [ ] **Step 6: Commit** `feat(api): bot people + proposals (usulan disposisi)`.

### Task 4: Pembuatan item bersama dan halaman `/usulan/[id]`

**Files:**
- Create: `app/(protected)/progress/create-items.ts`, `app/(protected)/usulan/[id]/page.tsx`, `app/(protected)/usulan/[id]/actions.ts`, `app/(protected)/usulan/[id]/ProposalDecisionForm.tsx`
- Modify: `app/(protected)/progress/actions.ts` (`addProgressItem` memakai `createProgressItems`)

**Interfaces:**
- Produces:
  - `createProgressItems(supabase: SupabaseClient, input: { title: string; picIds: string[]; targetDate: string; createdBy: string; proposalId?: string }): Promise<{ error: string | null }>` — insert satu baris per PIC (+ `proposal_id`) lalu notifikasi lonceng persis seperti `addProgressItem` sekarang (judul notifikasi "Tugas baru dari Kepala Divisi").
  - `approveProposal(id: string, formData: FormData): Promise<{ error?: string }>` — field form: `title`, `pic_id` (ganda), `target_date`.
  - `rejectProposal(id: string, formData: FormData): Promise<{ error?: string }>` — field `alasan_tolak` opsional.

- [ ] **Step 1: Ekstrak `createProgressItems`** dan pakai di `addProgressItem` (perilaku form Monitor Progress tidak berubah). `npx tsc --noEmit` bersih.
- [ ] **Step 2: Server actions.** Keduanya: user wajib login dan `role === 'kadiv'`, selain itu `{ error: 'Hanya Kepala Divisi' }`.
  `approveProposal`: validasi form (judul ≤ 200, ≥ 1 PIC, tanggal ≥ hari ini WIB) → **klaim** dulu dengan `update progress_proposals set status='disetujui', decided_by, decided_at, judul, pic_ids, target_date where id=$1 and status='menunggu'` dan `.select('id')` → 0 baris → `{ error: 'Usulan sudah diputus' }` → `createProgressItems(..., proposalId)`; bila gagal, kembalikan status ke `menunggu` dan laporkan error → `revalidatePath('/usulan/'+id)`, `'/progress'`, `'/dashboard'`.
  `rejectProposal`: klaim yang sama dengan `status='ditolak'` + `alasan_tolak` (≤ 300).
- [ ] **Step 3: Halaman.** Server component; `params: Promise<{ id: string }>`; bukan Kadiv → `notFound()`; usulan tidak ada → `notFound()`. Menampilkan nomor & tanggal TEO, perihal, instruksi, alasan tenggat, nama bot pengusul (label token). Status `menunggu` → `ProposalDecisionForm` (client) dengan judul, PIC (checkbox, daftar profil aktif non-Kadiv seperti `/progress`), tenggat terisi usulan, tombol **Setujui** dan **Tolak** (+ alasan opsional), tombol nonaktif saat terkirim. Status lain → ringkasan keputusan, tanpa tombol. Tata letak satu kolom, nyaman di layar 375px.
- [ ] **Step 4: Verifikasi tanpa menulis data:** login sebagai Kadiv di dev, buka `/usulan/00000000-0000-0000-0000-000000000000` → halaman 404 aplikasi; `/progress` tampil normal (penambahan item lewat form tidak diuji karena menulis DB); `npx tsc --noEmit` dan `npm run build` bersih.
- [ ] **Step 5: Commit** `feat: halaman persetujuan usulan + createProgressItems`.

### Task 5: Login kembali ke halaman tujuan

**Files:**
- Modify: `proxy.ts` (daftar `isProtected` + `next`), `app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: `safeNextPath` (Task 2).

- [ ] **Step 1: `proxy.ts`.** Tambahkan `'/usulan'` dan `'/progress'` ke `isProtected`; saat redirect ke `/login`, set `url.search = ''` lalu `url.searchParams.set('next', pathname + request.nextUrl.search)`. Pengguna yang sudah login dan membuka `/login?next=…` diarahkan ke `safeNextPath(next) ?? '/dashboard'`.
- [ ] **Step 2: Halaman login.** Setelah sign-in sukses, baca `next` dari `window.location.search` (bukan `useSearchParams`, agar tidak butuh Suspense); `safeNextPath(next)` tidak null → `router.push(next)`, selain itu logika peran yang ada.
- [ ] **Step 3: Verifikasi:** skrip `check-usulan.mjs` → OK; di jendela privat (belum login) buka `localhost:3000/usulan/abc` → URL menjadi `/login?next=%2Fusulan%2Fabc`; `npm run build` bersih.
- [ ] **Step 4: Commit** `feat(auth): login kembali ke halaman tujuan (?next=)`.

### Task 6: Dashboard dan ringkasan bot

**Files:**
- Modify: `app/(protected)/dashboard/page.tsx`, `lib/bot-access.ts`

**Interfaces:**
- Consumes: `ProgressProposal` (Task 1).
- Produces: `BotSummary.butuh_kadiv_hari_ini.usulan_menunggu: number`; entri `bidang[].progres_terlambat[]` mendapat `teo_ref: string | null`.

- [ ] **Step 1: Dashboard.** Query paralel usulan `status='menunggu'` (urut `created_at` asc). Di "Butuh Anda hari ini": baris usulan tampil paling atas sebelum kegiatan, label **USULAN TARGET** (gaya `REASON_STYLE` baru, warna navy), isi: judul usulan, `perihal` (TEO `teo_ref`), nama PIC, "usulan tenggat {formatDate}" → link `/usulan/{id}`. Chip ringkasan menambah "{n} usulan target" bila n > 0; badge total = kegiatan + usulan; kondisi kosong hanya bila keduanya 0. Usulan tidak masuk `lib/attention.ts` dan tidak dihitung dalam batas 7 kegiatan.
- [ ] **Step 2: Ringkasan bot.** `progress_items` di-select dengan `proposal_id, progress_proposals(teo_ref)`; isi `teo_ref` di `progres_terlambat` (null untuk item manual). Hitung `usulan_menunggu` (abaikan cakupan dept untuk token `scope: 'all'`; token `scope: 'dept'` → 0). Teks `?format=text`: baris "Usulan target menunggu Kadiv: N" di bawah judul "Butuh Kadiv hari ini" bila N > 0; item terlambat menulis `(TEO {teo_ref})` bila ada.
- [ ] **Step 3: Verifikasi:** `npx tsc --noEmit`, skrip cek (`check-attention.mjs`, `check-usulan.mjs`) OK, `npm run build` bersih; dashboard dev tampil normal dengan 0 usulan (tidak ada chip/baris usulan).
- [ ] **Step 4: Commit** `feat: usulan target di Butuh Anda + teo_ref di ringkasan bot`.

### Task 7: Dokumen, uji ujung-ke-ujung (gated), deploy

**Files:**
- Modify: `docs/bot-access.md` (endpoint baru, izin `can_propose`, contoh curl POST/GET, aturan idempoten, larangan data)

- [ ] **Step 1: Dokumentasi** `docs/bot-access.md` + tautkan spec §6.5 sebagai kontrak KEVIN. Commit `docs: kontrak bot usulan disposisi`.
- [ ] **Step 2: (minta izin Boss — menulis ke DB production)** Buat token uji `uji-usulan` lewat `POST /api/bot/tokens`, Boss beri `can_propose` via SQL; kirim usulan `teo_ref = 'UJI-20261123'` ke dev → `201 {url}`; kirim lagi dengan judul berbeda → `200`, judul tetap yang pertama.
- [ ] **Step 3:** Buka `url` sebagai Kadiv; ubah tenggat; **Setujui** → item muncul di `/progress` dengan PIC yang dipilih; refresh dan klik Setujui di tab kedua yang masih terbuka → "Usulan sudah diputus", jumlah item tetap.
- [ ] **Step 4:** Buka `url` sebagai akun non-Kadiv (bila Boss menyediakan akun uji) → 404. Bila tidak ada akun uji, catat sebagai tidak terverifikasi.
- [ ] **Step 5:** Bersihkan: Boss menjalankan SQL hapus item `proposal_id` uji, usulan `UJI-20261123`, dan cabut token `uji-usulan` (`{"action":"revoke"}`).
- [ ] **Step 6: Deploy.** Pastikan migration 018 sudah jalan di production (probe Task 1 Step 3) → secret scan diff → `git pull --rebase` → push `main` → `vercel --prod` → cek alias `monitor-giat.vercel.app` dan `curl …/api/bot/people` → `401`.
- [ ] **Step 7:** Buat token KEVIN (`label: kevin-hermes`), Boss beri `can_propose`; serahkan token ke Kevin lewat jalur aman bersama spec §6.5. Catat di `decision-log.md`.
