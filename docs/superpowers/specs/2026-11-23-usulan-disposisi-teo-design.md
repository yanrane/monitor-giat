# Desain — Usulan target dari disposisi TEO

Tanggal: 2026-11-23 · Pemilik: Kadiv (Boss Wayan) · Status: draf, menunggu persetujuan

## 1. Maksud dan alasan

Kadiv mendisposisi surat di TEO PT Timah (teo.pttimah.co.id). Saat ini disposisi itu harus
diketik ulang manual ke Monitor Progress (judul, PIC, target), sehingga ada yang terlewat dan
tenggat sering asal pasang. Tujuannya:

1. AI agent (KEVIN Hermes atau bot openbot.run, keduanya sudah punya akses TEO) membaca
   disposisi Kadiv dan **mengusulkan** item Monitor Progress lengkap dengan usulan tenggat.
2. Kadiv **menyetujui di aplikasi** (link dari WA), boleh mengubah tenggat/PIC/judul, atau menolak.
3. Setelah disetujui, item terbentuk seperti input manual. Kalau tenggat lewat dan PIC belum
   mencentang selesai di Monitor Giat, **KEVIN menegur PIC lewat WA**.

## 2. Sasaran, bukan sasaran, anti-sasaran

**Sasaran**
- Disposisi → usulan target tanpa ketik ulang; Kadiv cukup satu ketukan untuk menyetujui.
- Usulan yang belum diputus tampil di "Butuh Anda hari ini".
- KEVIN punya data yang cukup untuk menegur PIC yang terlambat dan menyebut nomor disposisinya.

**Bukan sasaran (sekarang)**
- Monitor Giat membaca TEO sendiri — itu tugas agent.
- Agent menyetujui usulan atau menandai item selesai.
- Mengirim WA dari Monitor Giat — WA tetap wilayah KEVIN.
- Item disposisi yang terlambat masuk "Butuh Anda hari ini" (urusan PIC ditangani KEVIN).

**Anti-sasaran (gagal walau secara teknis jalan)**
- PIC ditegur untuk pekerjaan yang belum disetujui Kadiv.
- Satu disposisi muncul dobel karena dua agent membaca surat yang sama.
- Bot bisa mengubah/menghapus item, atau menerima nomor telepon / isi surat melebihi kebutuhan.

## 3. Batasan

- Next.js 16 App Router + Supabase (RLS), Tailwind v4. Baca `node_modules/next/dist/docs/` sebelum memakai API Next baru (AGENTS.md).
- Akses bot memakai `bot_tokens` (hash sha256) dan `bot_access_logs` — lihat `docs/bot-access.md`.
  Semua jalur bot sejauh ini read-only.
- `progress_items`: satu baris per PIC; insert hanya Kadiv (`created_by = auth.uid()`); notifikasi
  lonceng ke PIC via service_role (pola `addProgressItem` di `app/(protected)/progress/actions.ts`).
- Migration dijalankan manual oleh Boss di SQL Editor Supabase; nomor berikutnya **018**
  (repo dibagi dengan Kevin — cek tabrakan nomor, `git pull --rebase` sebelum push).
- Deploy manual `vercel --prod` (Git auto-deploy tidak jalan).
- Semantik data yang dipantau KEVIN hanya diubah dengan koordinasi Kevin (decision-log 22 Jul).

## 4. Pendekatan yang ditimbang

| | Pendekatan | Untung | Rugi | Keputusan |
|---|---|---|---|---|
| A | **Tabel usulan terpisah**; item dibuat saat Kadiv setuju | `progress_items` dan semua pembacanya (dashboard, /progress, bot summary, query KEVIN) tidak berubah dan tak pernah melihat usulan | Satu tabel + halaman baru | **Dipilih Boss** |
| B | Usulan disimpan di `progress_items` berstatus "usulan" | Tabel lebih sedikit | Semua pembaca harus menyaring status baru; satu terlewat → PIC ditegur untuk item belum disetujui | Ditolak |
| C | Kadiv setuju lewat balasan WA, KEVIN menulis item | Paling praktis | Bot memegang wewenang menyetujui; salah tangkap kalimat jadi target resmi | Ditolak Boss (persetujuan harus di aplikasi) |

## 5. Yang sudah diputuskan Boss

- Jalur masuk: agent membaca TEO sendiri (keduanya sudah punya akses).
- Persetujuan: di aplikasi, lewat link dari WA KEVIN. Bot hanya bisa mengusulkan.
- Tindak lanjut = PIC mencentang selesai di Monitor Giat.
- Pendekatan A.

## 6. Desain

### 6.1 Data (migration 018)

Tabel `progress_proposals`:

| Kolom | Tipe | Catatan |
|---|---|---|
| id | uuid PK | |
| teo_ref | text NOT NULL **UNIQUE** | nomor agenda/surat TEO; kunci anti-dobel |
| teo_tanggal | date | tanggal disposisi |
| perihal | text NOT NULL | ≤ 300 karakter |
| instruksi | text | isi disposisi Kadiv, ≤ 1000 karakter (bukan isi surat) |
| judul | text NOT NULL | usulan judul pekerjaan, ≤ 200 |
| pic_ids | uuid[] NOT NULL | ≥ 1, profil aktif non-Kadiv |
| target_date | date NOT NULL | usulan tenggat |
| alasan_tenggat | text | ≤ 300, mis. "review kontrak biasanya 3 hari kerja" |
| status | text | `menunggu` / `disetujui` / `ditolak`, default `menunggu` |
| proposed_by_token | uuid FK bot_tokens | bot pengusul |
| decided_by | uuid FK profiles | Kadiv |
| decided_at | timestamptz | |
| alasan_tolak | text | opsional |
| created_at | timestamptz | |

- `progress_items.proposal_id uuid NULL REFERENCES progress_proposals(id)` — rujukan asal.
- `bot_tokens.can_propose boolean NOT NULL DEFAULT false` — izin eksplisit, terpisah dari `can_write`.
- RLS: SELECT/UPDATE hanya Kadiv; tanpa policy INSERT untuk klien (insert lewat API bot dengan service_role).

### 6.2 API bot (header `x-bot-token`, tercatat di `bot_access_logs`)

- `GET /api/bot/people` → `[{id, nama, bidang}]` profil aktif non-Kadiv. Tanpa nomor telepon.
- `POST /api/bot/proposals` (wajib `can_propose`) → body `{teo_ref, teo_tanggal, perihal, instruksi, judul, pic_ids, target_date, alasan_tenggat}`.
  - Validasi di batas kepercayaan (zod, sudah ada di deps): panjang field, `pic_ids` ada & aktif,
    `target_date` antara hari ini dan +365 hari.
  - **Idempoten**: `teo_ref` sudah ada → 200 dengan usulan yang ada (status apa pun), bukan error.
  - Respons `{id, status, url}` — `url` = `https://monitor-giat.vercel.app/usulan/<id>` untuk dikirim KEVIN ke WA Kadiv.
- `GET /api/bot/proposals?status=&sejak=` → daftar usulan + keputusan (judul akhir, PIC, tenggat akhir), supaya KEVIN tahu kapan mengirim penugasan WA ke PIC.
- `/api/bot/summary`: tiap entri `progres_terlambat` diberi `teo_ref` (null untuk item manual); `butuh_kadiv_hari_ini` diberi `usulan_menunggu` (jumlah). Field lama tetap.

### 6.3 Halaman persetujuan `/usulan/[id]` (Kadiv saja, ramah HP)

- Tampil: nomor & tanggal TEO, perihal, instruksi, usulan judul, PIC, tenggat + alasan, bot pengusul.
- Form: judul, PIC (pilih ganda seperti ProgressForm), tenggat — terisi usulan, boleh diubah.
- Tombol **Setujui**, **Tolak** (alasan opsional). Status sudah diputus → tampil hasilnya, tanpa tombol.
- Setujui (server action, sebagai Kadiv): buat `progress_items` per PIC dengan `proposal_id` +
  notifikasi lonceng (logika `addProgressItem` diekstrak jadi fungsi bersama), lalu set status.
  Cegah klik ganda: update status hanya bila masih `menunggu`.
- **Link WA harus selamat melewati login.** Sekarang `proxy.ts` mengarahkan ke `/login` tanpa
  tujuan dan halaman login selalu `router.push('/dashboard')`. Ubah: proxy menambah
  `?next=<path>`; login mengikuti `next` hanya bila diawali `/` dan bukan `//` (cegah open redirect).

### 6.4 Dashboard

- "Butuh Anda hari ini": usulan `menunggu` tampil paling atas dengan label **USULAN TARGET**,
  baris berisi perihal, PIC, usulan tenggat → link ke `/usulan/[id]`. Chip ringkasan menambah
  "N usulan target". Usulan tidak masuk `lib/attention.ts` (itu khusus kegiatan) — dirakit di dashboard.

### 6.5 Bagian KEVIN (dikerjakan Kevin; kontrak ini)

1. Baca disposisi Kadiv di TEO; abaikan yang hanya "untuk diketahui/arsip".
2. Petakan penerima disposisi ke `GET /api/bot/people`; kalau tidak ada yang cocok, beri tahu Kadiv, jangan kirim usulan.
3. Tentukan tenggat (hari kerja Senin–Jumat, tanpa kalender libur): "segera" 2 hari kerja; review/draft kontrak 3; legal opinion 5; litigasi mengikuti jadwal sidang dikurangi 2 hari kerja; lainnya 5. Isi `alasan_tenggat`.
4. `POST /api/bot/proposals`, kirim `url` ke WA Kadiv. Ingatkan Kadiv sekali per hari kerja untuk usulan yang masih `menunggu`.
5. Setelah disetujui (`GET /api/bot/proposals`), kirim WA penugasan ke PIC (judul, tenggat, nomor TEO).
6. Teguran: H+1 setelah tenggat bila item belum selesai → WA ke PIC; ulang tiap 3 hari kerja sampai selesai; mulai teguran kedua tembuskan Kabid PIC. Sebut `teo_ref`.
7. Hanya satu agent yang mengusulkan (KEVIN); bot openbot.run tetap read-only. Kalau keduanya mengirim, `teo_ref` UNIQUE mencegah dobel.

### 6.6 Keamanan & data

- Token dengan `can_propose` dibuat khusus KEVIN; token lain tetap tanpa izin itu. Token dibuat
  lewat `POST /api/bot/tokens` seperti biasa, lalu izinnya diberikan Boss dengan satu baris SQL
  (`update bot_tokens set can_propose = true where label = '<label KEVIN>'`) — endpoint token tidak diubah.
- Yang disimpan dari TEO hanya nomor, tanggal, perihal, dan instruksi disposisi — bukan isi/lampiran surat.
- Bot tidak menerima nomor telepon dari Monitor Giat (KEVIN memakai kontaknya sendiri).

### 6.7 Cek

Satu skrip cek (pola `scripts/check-attention.mjs`) untuk validasi payload usulan: field wajib,
batas panjang, rentang tanggal, idempoten `teo_ref`.

## 7. Keputusan yang saya ambil (mohon dicek)

1. Satu disposisi = satu pekerjaan (boleh banyak PIC). Disposisi berisi beberapa tugas berbeda → Kadiv tambah manual.
2. Kadiv boleh mengubah judul dan PIC saat menyetujui, bukan hanya tenggat.
3. Hanya KEVIN yang mengusulkan; openbot.run tetap baca-saja.
4. Durasi default di §6.5 butir 3 dan ritme teguran di butir 6.
5. Setelah disetujui, KEVIN langsung mengirim WA penugasan ke PIC.
6. Usulan yang tak diputus tidak kedaluwarsa; KEVIN mengingatkan tiap hari kerja.
7. Login mengembalikan Kadiv ke halaman tujuan (`?next=`), supaya link WA tetap berguna saat sesi habis.
8. Izin `can_propose` diberikan lewat SQL, bukan lewat endpoint token.

## 8. Diserahkan ke pembangun

Penamaan file/komponen, tata letak persis halaman `/usulan/[id]`, isi teks notifikasi, dan
penulisan SQL migration (termasuk RLS) mengikuti pola repo.
