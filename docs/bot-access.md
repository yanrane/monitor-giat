# Akses Bot ke Monitor Giat (read-only)

Bot (mis. **Grok Bot** per Kabid) **tidak login sebagai manusia**. Setiap bot memegang
satu token sendiri dan memanggil endpoint read-only. Tidak ada password Kabid yang
dibagikan, tidak ada sesi browser yang bertabrakan, dan setiap pemakaian tercatat.

## 1. Endpoint

| Jalur | Fungsi |
|---|---|
| `GET /api/bot/summary` | Ringkasan JSON lintas bidang (kegiatan terbuka, butuh keputusan Kadiv, terhambat, progres terlambat, log harian) |
| `GET /api/bot/summary?format=text` | Versi teks siap dikirim ke WhatsApp/chat |
| `GET /bot-view?token=<token>` | Halaman HTML read-only untuk dilihat bot |
| `GET/POST /api/bot/tokens` | Kelola token (khusus Kadiv, bearer token Supabase) |

Autentikasi: header `x-bot-token: <token>` (alternatif: `Authorization: Bearer <token>`
atau `?token=<token>`).

Contoh:

```bash
curl -s "https://monitor-giat.vercel.app/api/bot/summary" -H "x-bot-token: <TOKEN>"
curl -s "https://monitor-giat.vercel.app/api/bot/summary?format=text" -H "x-bot-token: <TOKEN>"
```

## 2. Membuat token baru (Kadiv)

Ambil bearer token dari sesi Supabase yang sedang login, lalu:

```bash
curl -s -X POST "https://monitor-giat.vercel.app/api/bot/tokens" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN_SESI>" \
  -d '{"label":"bot-kabid-litigasi","owner_name":"Sri Endang Kusumaningrum","scope":"all"}'
```

Respons memuat `token_plaintext` — **hanya muncul sekali**. Simpan segera.

Untuk mencabut: `{"action":"revoke","id":"<uuid>"}`. Mengaktifkan kembali:
`{"action":"activate","id":"<uuid>"}`.

## 3. Model keamanan

- Token disimpan hanya sebagai `sha256(token)` di `bot_tokens`. Token asli tidak pernah tersimpan.
- `bot_tokens` dan `bot_access_logs` ber-RLS **tanpa policy** + `REVOKE` dari `anon`/`authenticated`
  → hanya `service_role` (API route) yang bisa menyentuh. Tidak ada jalan baca dari klien publik.
- Semua jalur bot **read-only**. `can_write` default `false`; tidak ada endpoint tulis untuk bot.
- `scope: "dept"` + `dept_id` membatasi hasil ke salah satu bidang; `scope: "all"` untuk lintas bidang.
- Setiap panggilan tercatat di `bot_access_logs`; `bot_tokens.last_used_at` + `request_count`
  menunjukkan token mana yang masih dipakai (berguna untuk mencabut token yang sudah mati).

## 4. Prinsip data

Payload bot sengaja dibatasi: judul kegiatan, nama PIC, status, prioritas, status kendali,
next action, blocker, tanggal target, dan status pengisian log harian. Kolom `description`
kegiatan, isi log, lampiran, dan nomor telepon **tidak** disertakan.

Catatan kepatuhan: Grok Bot menjalankan pekerjaan di komputer cloud pihak ketiga, jadi data
Divisi Hukum yang dikirim ke bot pada dasarnya keluar dari lingkungan PT Timah. Untuk itu
payload dijaga minimum dan read-only. Jangan tambahkan nomor telepon, isi dokumen, atau
data perkara ke payload tanpa persetujuan Kadiv.

## 5. Usulan target dari disposisi TEO (khusus agent pengusul)

Satu-satunya jalur tulis untuk bot: **mengusulkan**. Bot tidak bisa menyetujui, mengubah, atau
menghapus item. Item `progress_items` baru terbentuk setelah Kadiv menekan **Setujui** di
`/usulan/<id>`. Kontrak lengkap KEVIN: `docs/superpowers/specs/2026-11-23-usulan-disposisi-teo-design.md` §6.5.

Izin: token butuh `can_propose = true` (default `false`). Diberikan Boss lewat SQL Editor:

```sql
update bot_tokens set can_propose = true where label = '<label token KEVIN>';
```

| Jalur | Fungsi |
|---|---|
| `GET /api/bot/people` | `[{id, nama, bidang}]` profil aktif non-Kadiv untuk memetakan penerima disposisi |
| `POST /api/bot/proposals` | Kirim usulan; respons `{id, status, url}` — `url` dikirim ke WA Kadiv |
| `GET /api/bot/proposals?status=&sejak=YYYY-MM-DD&diputus_sejak=YYYY-MM-DD` | Keputusan Kadiv (judul akhir, PIC, tenggat akhir, alasan tolak). `sejak` = tanggal usulan dibuat; **`diputus_sejak`** = tanggal Kadiv memutus (urut terbaru) — pakai ini untuk mengambil persetujuan baru, termasuk atas usulan lama |

Ketiganya menolak token tanpa `can_propose` (403).

Body `POST` (JSON):

```json
{
  "teo_ref": "ND-123/2026",
  "teo_tanggal": "2026-11-23",
  "perihal": "Permohonan review draft PKS",
  "instruksi": "Pelajari dan beri masukan",
  "judul": "Review draft PKS dengan PT X",
  "pic_ids": ["<uuid dari /api/bot/people>"],
  "target_date": "2026-11-26",
  "alasan_tenggat": "Review kontrak: 3 hari kerja"
}
```

Aturan:

- Wajib: `teo_ref` (≤100), `perihal` (≤300), `judul` (≤200), `pic_ids` (≥1, profil aktif non-Kadiv), `target_date` (hari ini s.d. +365 hari, WIB).
- Opsional: `teo_tanggal` (string kosong = tidak ada), `instruksi` (≤1000), `alasan_tenggat` (≤300).
- Teks tidak boleh mengandung karakter NUL; tanggal harus tanggal kalender valid (1900–2100).
- **Idempoten per `teo_ref`**: kirim ulang → `200` dengan usulan yang sudah ada; isinya tidak ditimpa.
  `teo_ref` dinormalisasi (huruf besar, spasi ganda dirapikan): `nd  123/2026` = `ND 123/2026`.
  Usulan baru → `201`. Validasi gagal → `400 {errors: [...]}`.
- `/api/bot/summary` kini memuat `butuh_kadiv_hari_ini.usulan_menunggu` dan `teo_ref` di tiap
  entri `progres_terlambat` (null untuk item manual) — dipakai KEVIN untuk teguran WA ke PIC.
- Jangan kirim isi atau lampiran surat — cukup nomor, tanggal, perihal, dan instruksi disposisi.
