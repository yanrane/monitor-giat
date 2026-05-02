# Monitor Kegiatan — Divisi Hukum PT Timah Tbk

Aplikasi web monitoring jadwal kegiatan untuk Kepala Divisi Hukum dan 4 departemen di bawahnya.

## Tech Stack
- **Framework**: Next.js 16 (App Router) + TypeScript
- **UI**: Tailwind CSS v4 + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Deploy**: Vercel

## Perintah Dev

```bash
npm install       # Install dependencies
npm run dev       # Dev server di http://localhost:3000
npm run build     # Build production
npm run start     # Jalankan production build
```

## Environment Variables

Buat file `.env.local` dengan isi:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
RESEND_API_KEY=re_your-resend-key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

## Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com)
2. Copy URL dan anon key ke `.env.local`
3. Buka **SQL Editor** di Supabase dashboard
4. Jalankan isi file `supabase/migrations/001_initial_schema.sql`
5. Buat Storage bucket: **Storage → New bucket → nama: `attachments` → Private**

## Peran Pengguna

| Role | Akses |
|---|---|
| `kadiv` | Lihat semua departemen, beri komentar, kelola user |
| `dept_head` | CRUD kegiatan dept sendiri, upload lampiran |
| `staff` | Tambah & edit kegiatan dept sendiri, upload lampiran |

## Struktur Folder Penting

```
app/
  (auth)/login/         — Halaman login
  (protected)/
    dashboard/          — Dashboard Kadiv (ringkasan 4 dept)
    departments/[id]/   — Daftar kegiatan per dept
    activities/[id]/    — Detail kegiatan (komentar + lampiran)
    activities/new/     — Form tambah kegiatan
    calendar/           — Kalender bulanan
    notifications/      — Pusat notifikasi
    admin/              — Kelola pengguna (Kadiv only)
components/
  ActivityCard.tsx, ActivityForm.tsx, DepartmentCard.tsx
  StatusBadge.tsx, CalendarView.tsx, CommentThread.tsx
  FileUploader.tsx, NotificationBell.tsx
lib/
  supabase/client.ts    — Browser Supabase client
  supabase/server.ts    — Server Supabase client (RSC)
  types.ts              — TypeScript types
proxy.ts                — Auth guard (Next.js 16 middleware)
```

## Deploy ke Vercel

1. Push kode ke GitHub
2. Buka [vercel.com](https://vercel.com), connect repo
3. Set environment variables yang sama dengan `.env.local`
4. Deploy — otomatis build dan tersedia online

## Notifikasi Email

Gunakan Supabase Edge Functions + Resend API:
- Trigger otomatis H-3 dan H-1 sebelum tenggat kegiatan
- Notifikasi perubahan status ke Kadiv
- Notifikasi komentar Kadiv ke Dept Head

Lihat `supabase/functions/send-notification/` untuk implementasi.
