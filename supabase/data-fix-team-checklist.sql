-- ============================================================
-- Perbaikan data 12 Jul 2026: grup pekerjaan parsial akibat bug
-- toggle tim (RLS hanya izinkan PIC update baris sendiri, jadi
-- saat satu anggota tim mencentang, baris rekan tertinggal pending
-- padahal notifikasi "selesai" sudah terkirim ke Kadiv).
--
-- Kode sudah diperbaiki (commit ee8d856, deploy 12 Jul). SQL ini
-- menyamakan baris pending dengan waktu selesai PALING AWAL di
-- grupnya (waktu asli si pencentang) supaya status Tepat Waktu /
-- Terlambat tetap akurat.
--
-- Jalankan SEKALI di Supabase SQL Editor. Aman diulang (idempotent).
-- ============================================================

UPDATE progress_items p
SET status = 'done',
    completed_at = d.first_done
FROM (
  SELECT title, target_date, min(completed_at) AS first_done
  FROM progress_items
  WHERE status = 'done'
  GROUP BY title, target_date
) d
WHERE p.status = 'pending'
  AND p.title = d.title
  AND p.target_date = d.target_date;

-- Verifikasi: harus 0 baris (tidak ada lagi grup campur done+pending)
SELECT title, target_date,
       count(*) FILTER (WHERE status = 'done')    AS selesai,
       count(*) FILTER (WHERE status = 'pending') AS belum
FROM progress_items
GROUP BY title, target_date
HAVING count(*) FILTER (WHERE status = 'done') > 0
   AND count(*) FILTER (WHERE status = 'pending') > 0;
