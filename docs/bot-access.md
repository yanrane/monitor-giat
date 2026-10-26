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
